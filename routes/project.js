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
const router = express_1.default.Router();
const tempFileRemovalTimeoutMs = 1000 * 60 * 30; // 30 minutes
tmp_1.default.setGracefulCleanup(); // remove any tmp file artifacts on process exit
/**
 * Generates and sends back an APK file.
 * Expects a POST body containing @see ApkOptions object.
 */
router.post("/generateApk", async function (request, response) {
    const apkRequest = validateApkRequest(request);
    if (apkRequest.validationErrors.length > 0 || !apkRequest.options) {
        response.status(500).send("Invalid PWA settings: " + apkRequest.validationErrors.join(", "));
        return;
    }
    try {
        const apk = await createApk(apkRequest.options);
        response.sendFile(apk.filePath);
        console.log("Generated APK successfully for domain", apkRequest.options.host);
    }
    catch (err) {
        console.log("Error generating signed APK", err);
        response.status(500).send("Error generating signed APK: " + err);
    }
});
/**
 * Generates an APK package and zips it up along with the signing key info. Sends back the zip file.
 * Expects a POST body containing @see ApkOptions form data.
 */
router.post("/generateApkZip", async function (request, response) {
    const apkRequest = validateApkRequest(request);
    if (apkRequest.validationErrors.length > 0 || !apkRequest.options) {
        response.status(500).send("Invalid PWA settings: " + apkRequest.validationErrors.join(", "));
        return;
    }
    try {
        const apk = await createApk(apkRequest.options);
        // Create our zip file containing the APK, readme, and signing info.
        const zipFile = await createZipPackage(apk, apkRequest.options);
        if (zipFile) {
            response.sendFile(zipFile, {});
        }
        console.log("Process completed successfully.");
    }
    catch (err) {
        console.log("Error generating signed APK", err);
        response.status(500).send("Error generating signed APK: " + err);
    }
});
function validateApkRequest(request) {
    var _a;
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
    // We must have a keystore file uploaded if the signing mode is use existing.
    if (options.signingMode === "mine" && !((_a = options.signing) === null || _a === void 0 ? void 0 : _a.file)) {
        validationErrors.push("You must supply a signing key file when signing mode = 'mine'");
    }
    // Signing file must be a base 64 encoded string.
    if (options.signingMode === "mine" && options.signing && options.signing.file && !options.signing.file.startsWith("data:")) {
        validationErrors.push("Signing file must be a base64 encoded string containing the Android keystore file");
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
async function createApk(options) {
    let projectDir = null;
    try {
        // Create a temporary directory where we'll do all our work.
        projectDir = tmp_1.default.dirSync({ prefix: "pwabuilder-cloudapk-" });
        const projectDirPath = projectDir.name;
        // Get the signing information.
        const signing = await createLocalSigninKeyInfo(options, projectDirPath);
        // Generate the signed APK.
        const bubbleWrapper = new bubbleWrapper_1.BubbleWrapper(options, projectDirPath, signing);
        const apkPath = await bubbleWrapper.generateApk();
        return {
            filePath: apkPath,
            signingInfo: signing
        };
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
async function createZipPackage(apk, apkOptions) {
    console.log("Zipping APK and key info...");
    const apkName = `${apkOptions.name}${apkOptions.signingMode === "none" ? "-unsigned" : "-signed"}.apk`;
    let tmpZipFile = null;
    return new Promise((resolve, reject) => {
        try {
            const archive = archiver_1.default('zip', {
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
            output.on('close', () => {
                if (tmpZipFile) {
                    resolve(tmpZipFile);
                }
                else {
                    reject("No zip file was created");
                }
            });
            archive.pipe(output);
            // Append the APK, next steps readme, and signing key.
            archive.file(apk.filePath, { name: apkName });
            archive.file("./Next-steps.html", { name: "Readme.html" });
            if (apk.signingInfo) {
                archive.file(apk.signingInfo.keyFilePath, { name: "signing.keystore" });
                const readmeContents = [
                    "Keep your signing key information in a safe place. You'll need it in the future if you want to upload new versions of your PWA to the Google Play Store.\r\n",
                    "Key store file: signing.keystore",
                    `Key store password: ${apk.signingInfo.storePassword}`,
                    `Key alias: ${apk.signingInfo.alias}`,
                    `Key password: ${apk.signingInfo.keyPassword}`
                ];
                archive.append(readmeContents.join("\r\n"), { name: "signingKey-readme.txt" });
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
        console.log("scheduled cleanup for tmp file", file);
        const delFile = function () {
            const filePath = file.replace(/\\/g, "/"); // Use / instead of \ otherwise del gets failed to delete files on Windows
            del_1.default([filePath], { force: true })
                .then((deletedPaths) => console.log("Cleaned up tmp file", deletedPaths))
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
        console.log("scheduled cleanup for tmp directory", dirPatternToDelete);
        const delDir = function () {
            del_1.default([dirPatternToDelete], { force: true }) // force allows us to delete files outside of workspace
                .then((deletedPaths) => console.log("Cleaned up tmp directory", dirPatternToDelete, deletedPaths === null || deletedPaths === void 0 ? void 0 : deletedPaths.length, "subdirectories and files were deleted"))
                .catch((err) => console.warn("Unable to cleanup tmp directory. It will be cleaned up on process exit", err));
        };
        setTimeout(() => delDir(), tempFileRemovalTimeoutMs);
    }
}
module.exports = router;
//# sourceMappingURL=project.js.map