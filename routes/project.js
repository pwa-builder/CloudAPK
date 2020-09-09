"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bubbleWrapper_1 = require("../build/bubbleWrapper");
const path_1 = __importDefault(require("path"));
const tmp_1 = __importDefault(require("tmp"));
const archiver_1 = __importDefault(require("archiver"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const del_1 = __importDefault(require("del"));
const password_generator_1 = __importDefault(require("password-generator"));
const router = express_1.default.Router();
const tempFileRemovalTimeoutMs = 1000 * 60 * 5; // 5 minutes
tmp_1.default.setGracefulCleanup(); // remove any tmp file artifacts on process exit
// COMMENTED OUT: we no longer support an endpoint to generate a bare APK file. Doesn't make sense, given signing and app bundling.
//
// router.post("/generateApk", async function (request: express.Request, response: express.Response) {
//   const appPackageRequest = validateApkRequest(request);
//   if (appPackageRequest.validationErrors.length > 0 || !appPackageRequest.options) {
//     response.status(500).send("Invalid PWA settings: " + appPackageRequest.validationErrors.join(", "));
//     return;
//   }
//   try {
//     const apk = await createApk(appPackageRequest.options);
//     response.sendFile(apk.apkFilePath);
//     console.info("Generated APK successfully for domain", appPackageRequest.options.host);
//   } catch (err) {
//     console.error("Error generating signed APK", err);
//     response.status(500).send("Error generating signed APK: " + err);
//   }
// });
/**
 * Generates an APK package and zips it up along with the signing key info. Sends back the zip file.
 * Expects a POST body containing @see ApkOptions form data.
 *
 * Developer note: /generateApkZip is deprecated in favor of /generateAppPackage. Remove /generateApkZip by December 2020.
 */
router.post(["/generateAppPackage", "/generateApkZip"], async function (request, response) {
    const apkRequest = validateApkRequest(request);
    if (apkRequest.validationErrors.length > 0 || !apkRequest.options) {
        response.status(500).send("Invalid PWA settings: " + apkRequest.validationErrors.join(", "));
        return;
    }
    try {
        const appPackage = await createAppPackage(apkRequest.options);
        // Create our zip file containing the APK, readme, and signing info.
        const zipFile = await zipAppPackage(appPackage, apkRequest.options);
        response.sendFile(zipFile, {});
        console.info("Process completed successfully.");
    }
    catch (err) {
        console.error("Error generating app package", err);
        response.status(500).send("Error generating app package: " + err);
    }
});
function validateApkRequest(request) {
    const validationErrors = [];
    // If we were unable to parse ApkOptions, there's no more validation to do.
    let options = tryParseOptionsFromRequest(request);
    if (!options) {
        validationErrors.push("Malformed argument. Coudn't find ApkOptions in body");
        return {
            options: null,
            validationErrors,
        };
    }
    // Ensure we have required fields.
    const requiredFields = [
        "appVersion",
        "appVersionCode",
        "backgroundColor",
        "display",
        "fallbackType",
        "host",
        "iconUrl",
        "launcherName",
        "navigationColor",
        "packageId",
        "signingMode",
        "startUrl",
        "themeColor",
        "webManifestUrl"
    ];
    validationErrors.push(...requiredFields
        .filter(f => !options[f])
        .map(f => `${f} is required`));
    // We must have signing options if the signing is enabled.
    if (options.signingMode !== "none" && !options.signing) {
        validationErrors.push(`Signing options are required when signing mode = '${options.signingMode}'`);
    }
    // If the user is supplying their own signing key, we have some additional requirements:
    // - A signing key file must be specified
    // - The signing key file must be a base64 encoded string.
    // - A store password must be supplied
    // - A key password must be supplied
    if (options.signingMode === "mine" && options.signing) {
        // We must have a keystore file uploaded if the signing mode is use existing.
        if (!options.signing.file) {
            validationErrors.push("You must supply a signing key file when signing mode = 'mine'");
        }
        // Signing file must be a base 64 encoded string.
        if (options.signing.file && !options.signing.file.startsWith("data:")) {
            validationErrors.push("Signing file must be a base64 encoded string containing the Android keystore file");
        }
        if (!options.signing.storePassword) {
            validationErrors.push("You must supply a store password when signing mode = 'mine'");
        }
        if (!options.signing.keyPassword) {
            validationErrors.push("You must supply a key password when signing mode = 'mine'");
        }
    }
    // Validate signing option fields
    if (options.signingMode !== "none" && options.signing) {
        // If we don't have a key password or store password, create one now.
        if (!options.signing.keyPassword) {
            options.signing.keyPassword = password_generator_1.default(12, false);
        }
        if (!options.signing.storePassword) {
            options.signing.storePassword = password_generator_1.default(12, false);
        }
        // Verify we have the required signing options.
        const requiredSigningOptions = [
            "alias",
            "countryCode",
            "fullName",
            "keyPassword",
            "organization",
            "organizationalUnit",
            "storePassword"
        ];
        validationErrors.push(...requiredSigningOptions
            .filter(f => !(options === null || options === void 0 ? void 0 : options.signing[f]))
            .map(f => `Signing option ${f} is required`));
    }
    return {
        options: options,
        validationErrors
    };
}
function tryParseOptionsFromRequest(request) {
    // See if the body is our options request.
    if (request.body["packageId"]) {
        return request.body;
    }
    return null;
}
async function createAppPackage(options) {
    let projectDir = null;
    try {
        // Create a temporary directory where we'll do all our work.
        projectDir = tmp_1.default.dirSync({ prefix: "pwabuilder-cloudapk-" });
        const projectDirPath = projectDir.name;
        // Get the signing information.
        const signing = await createLocalSigninKeyInfo(options, projectDirPath);
        // Generate the APK, keys, and digital asset links.
        const bubbleWrapper = new bubbleWrapper_1.BubbleWrapper(options, projectDirPath, signing);
        return await bubbleWrapper.generateAppPackage();
    }
    finally {
        // Schedule this directory for cleanup in the near future.
        scheduleTmpDirectoryCleanup(projectDir === null || projectDir === void 0 ? void 0 : projectDir.name);
    }
}
async function createLocalSigninKeyInfo(apkSettings, projectDir) {
    var _a;
    // If we're told not to sign it, skip this.
    if (apkSettings.signingMode === "none") {
        return null;
    }
    // Did the user upload a key file for signing? If so, download it to our directory.
    const keyFilePath = path_1.default.join(projectDir, "signingKey.keystore");
    if (apkSettings.signingMode === "mine") {
        if (!((_a = apkSettings.signing) === null || _a === void 0 ? void 0 : _a.file)) {
            throw new Error("Signing mode is 'mine', but no signing key file was supplied.");
        }
        const fileBuffer = base64ToBuffer(apkSettings.signing.file);
        await fs_extra_1.default.promises.writeFile(keyFilePath, fileBuffer);
    }
    function base64ToBuffer(base64) {
        const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error("Invalid base 64 string");
        }
        return new Buffer(matches[2], 'base64');
    }
    // Make sure we have signing info supplied, otherwise we received bad data.
    if (!apkSettings.signing) {
        throw new Error(`Signing mode was set to ${apkSettings.signingMode}, but no signing information was supplied.`);
    }
    return {
        keyFilePath: keyFilePath,
        ...apkSettings.signing
    };
}
/***
 * Creates a zip file containing the signed APK, key store and key store passwords.
 */
async function zipAppPackage(appPackage, apkOptions) {
    console.info("Zipping app package...");
    const apkName = `${apkOptions.name}${apkOptions.signingMode === "none" ? "-unsigned" : ""}.apk`;
    let tmpZipFile = null;
    return new Promise((resolve, reject) => {
        try {
            const archive = archiver_1.default("zip", {
                zlib: { level: 5 }
            });
            archive.on("warning", function (zipWarning) {
                console.warn("Warning during zip creation", zipWarning);
            });
            archive.on("error", function (zipError) {
                console.error("Error during zip creation", zipError);
                reject(zipError);
            });
            tmpZipFile = tmp_1.default.tmpNameSync({
                prefix: "pwabuilder-cloudapk-",
                postfix: ".zip"
            });
            const output = fs_extra_1.default.createWriteStream(tmpZipFile);
            output.on("close", () => {
                if (tmpZipFile) {
                    resolve(tmpZipFile);
                }
                else {
                    reject("No zip file was created");
                }
            });
            archive.pipe(output);
            // Append the APK and next steps readme.
            const isSigned = !!appPackage.signingInfo;
            archive.file(appPackage.apkFilePath, { name: apkName });
            archive.file(isSigned ? "./Next-steps.html" : "./Next-steps-unsigned.html", { name: "Readme.html" });
            // If we've signed it, we should have signing info, asset links file, and app bundle.
            if (appPackage.signingInfo && appPackage.signingInfo.keyFilePath) {
                archive.file(appPackage.signingInfo.keyFilePath, { name: "signing.keystore" });
                const readmeContents = [
                    "Keep your this file and signing.keystore in a safe place. You'll need these files if you want to upload future versions of your PWA to the Google Play Store.\r\n",
                    "Key store file: signing.keystore",
                    `Key store password: ${appPackage.signingInfo.storePassword}`,
                    `Key alias: ${appPackage.signingInfo.alias}`,
                    `Key password: ${appPackage.signingInfo.keyPassword}`,
                    `Signer's full name: ${appPackage.signingInfo.fullName}`,
                    `Signer's organization: ${appPackage.signingInfo.organization}`,
                    `Signer's organizational unit: ${appPackage.signingInfo.organizationalUnit}`,
                    `Signer's country code: ${appPackage.signingInfo.countryCode}`
                ];
                archive.append(readmeContents.join("\r\n"), { name: "signing-key-info.txt" });
                // Zip up the asset links.
                if (appPackage.assetLinkFilePath) {
                    archive.file(appPackage.assetLinkFilePath, { name: "assetlinks.json" });
                }
                // Zip up the app bundle as well.
                if (appPackage.appBundleFilePath) {
                    archive.file(appPackage.appBundleFilePath, { name: `${apkOptions.name}.aab` });
                }
            }
            archive.finalize();
        }
        catch (err) {
            reject(err);
        }
        finally {
            scheduleTmpFileCleanup(tmpZipFile);
        }
    });
}
function scheduleTmpFileCleanup(file) {
    if (file) {
        console.info("Scheduled cleanup for tmp file", file);
        const delFile = function () {
            const filePath = file.replace(/\\/g, "/"); // Use / instead of \ otherwise del gets failed to delete files on Windows
            del_1.default([filePath], { force: true })
                .then((deletedPaths) => console.info("Cleaned up tmp file", deletedPaths))
                .catch((err) => console.warn("Unable to cleanup tmp file. It will be cleaned up on process exit", err, filePath));
        };
        setTimeout(() => delFile(), tempFileRemovalTimeoutMs);
    }
}
function scheduleTmpDirectoryCleanup(dir) {
    // We can't use dir.removeCallback() because it will fail with "ENOTEMPTY: directory not empty" error.
    // We can't use fs.rmdir(path, { recursive: true }) as it's supported only in Node 12+, which isn't used by our docker image.
    if (dir) {
        const dirToDelete = dir.replace(/\\/g, "/"); // Use '/' instead of '\', otherwise del gets confused and won't cleanup on Windows.
        const dirPatternToDelete = dirToDelete + "/**"; // Glob pattern to delete subdirectories and files
        console.info("Scheduled cleanup for tmp directory", dirPatternToDelete);
        const delDir = function () {
            del_1.default([dirPatternToDelete], { force: true }) // force allows us to delete files outside of workspace
                .then((deletedPaths) => console.info("Cleaned up tmp directory", dirPatternToDelete, deletedPaths === null || deletedPaths === void 0 ? void 0 : deletedPaths.length, "subdirectories and files were deleted"))
                .catch((err) => console.warn("Unable to cleanup tmp directory. It will be cleaned up on process exit", err));
        };
        setTimeout(() => delDir(), tempFileRemovalTimeoutMs);
    }
}
module.exports = router;
//# sourceMappingURL=project.js.map