"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bubbleWrapper_1 = require("../build/bubbleWrapper");
const path_1 = __importDefault(require("path"));
const generate_password_1 = __importDefault(require("generate-password"));
const tmp_1 = __importDefault(require("tmp"));
const archiver_1 = __importDefault(require("archiver"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const del_1 = __importDefault(require("del"));
const router = express_1.default.Router();
const tempFileRemovalTimeoutMs = 1000 * 60 * 30; // 30 minutes
tmp_1.default.setGracefulCleanup(); // remove any tmp file artifacts on process exit
router.get("/fetchTest", async function (request, response) {
    console.log("fetching...");
    try {
        var result = await node_fetch_1.default("https://sadchonks.com/kitteh-512.png");
        var buffer = await result.buffer();
        console.log("successfully got buffer", buffer.length);
        response.send("success: " + buffer.length.toString());
    }
    catch (fetchErr) {
        console.log("fetch err: ", fetchErr);
        response.send("fetch err: " + fetchErr);
    }
});
/**
 * Generates and sends back a signed .apk. Expects a POST body containing @see PwaSettings object.
 */
router.post("/generateSignedApk", async function (request, response) {
    const pwaSettings = request.body;
    const validationErrors = validateSettings(pwaSettings);
    if (validationErrors.length > 0) {
        response.status(500).send("Invalid PWA settings: " + validationErrors.join(", "));
        return;
    }
    try {
        const { apkPath, signingInfo } = await createSignedApk(pwaSettings);
        response.sendFile(apkPath);
        console.log("Process completed successfully.");
    }
    catch (err) {
        console.log("Error generating signed APK", err);
        response.status(500).send("Error generating signed APK: " + err);
    }
});
/**
 * Generates a signed .apk and zips it up along with the signing key info. Sends back the zip file. Expects a POST body containing @see PwaSettings object.
 */
router.post("/generateSignedApkZip", async function (request, response) {
    const pwaSettings = request.body;
    const validationErrors = validateSettings(pwaSettings);
    if (validationErrors.length > 0) {
        response.status(500).send("Invalid PWA settings: " + validationErrors.join(", "));
        return;
    }
    try {
        const { apkPath, signingInfo } = await createSignedApk(pwaSettings);
        // Zip up the APK, signing key, and readme.txt
        const zipFile = await zipApkAndKey(apkPath, pwaSettings, signingInfo);
        if (zipFile) {
            response.sendFile(zipFile);
        }
        console.log("Process completed successfully.");
    }
    catch (err) {
        console.log("Error generating signed APK", err);
        response.status(500).send("Error generating signed APK: " + err);
    }
});
/**
 *
 * Generates an unsigned APK
 */
router.post('/generateUnsignedApk', async (request, response) => {
    const pwaSettings = request.body;
    const validationErrors = validateSettings(pwaSettings);
    if (validationErrors.length > 0) {
        response.status(500).send("Invalid PWA settings: " + validationErrors.join(", "));
        return;
    }
    try {
        const { apkPath } = await createUnsignedApk(pwaSettings);
        response.sendFile(apkPath);
        console.log("Process completed successfully.");
    }
    catch (err) {
        console.log("Error generating un-signed APK", err);
        response.status(500).send("Error generating un-signed APK: " + err);
    }
});
function validateSettings(settings) {
    if (!settings) {
        return ["No settings supplied"];
    }
    const requiredFields = [
        "name",
        "host",
        "packageId",
        "iconUrl",
        "startUrl",
        "signingInfo",
        "appVersion"
        // "webManifestUrl" // this should be mandatory once we upgrade prod to pass it in
    ];
    return requiredFields
        .filter(f => !settings[f])
        .map(f => `${f} is required`);
}
async function createSignedApk(pwaSettings) {
    var _a;
    let projectDir = null;
    try {
        projectDir = tmp_1.default.dirSync({ prefix: "pwabuilder-cloudapk-" });
        const projectDirPath = projectDir.name;
        // For now, we generate a signing key on behalf of the user. 
        // In the future, we may allow the user to pass in an existing key.
        const signingInfo = createSigningKeyInfo(projectDirPath, pwaSettings);
        // Generate the signed APK.
        const llama = new bubbleWrapper_1.BubbleWrapper(pwaSettings, projectDirPath, signingInfo);
        const apkPath = await llama.generateApk();
        return {
            apkPath,
            signingInfo
        };
    }
    finally {
        // Schedule this directory for cleanup in the near future.
        scheduleTmpDirectoryCleanup((_a = projectDir) === null || _a === void 0 ? void 0 : _a.name);
    }
}
async function createUnsignedApk(pwaSettings) {
    var _a;
    let projectDir = null;
    try {
        projectDir = tmp_1.default.dirSync({ prefix: "pwabuilder-cloudapk-" });
        const projectDirPath = projectDir.name;
        // For now, we generate a signing key as the BubbleWrapper class expects one
        // this avoids rewriting this crucial class and potentially creating bugs
        // the key is just not used in this case when actually building the APK
        const signingInfo = createSigningKeyInfo(projectDirPath, pwaSettings);
        // Generate the signed APK.
        const llama = new bubbleWrapper_1.BubbleWrapper(pwaSettings, projectDirPath, signingInfo);
        const apkPath = await llama.generateUnsignedApk();
        return {
            apkPath
        };
    }
    finally {
        // Try to delete the tmp directory immediately.
        scheduleTmpDirectoryCleanup((_a = projectDir) === null || _a === void 0 ? void 0 : _a.name);
    }
}
function createSigningKeyInfo(projectDirectory, pwaSettings) {
    return {
        keyStorePath: path_1.default.join(projectDirectory, "my-signing-key.keystore"),
        keyStorePassword: generate_password_1.default.generate({ length: 12, numbers: true }),
        keyAlias: "my-key-alias",
        keyPassword: generate_password_1.default.generate({ length: 12, numbers: true }),
        firstAndLastName: pwaSettings.signingInfo.fullName,
        organization: pwaSettings.signingInfo.organization,
        organizationalUnit: pwaSettings.signingInfo.organizationalUnit,
        countryCode: pwaSettings.signingInfo.countryCode
    };
}
/***
 * Creates a zip file containing the signed APK, key store and key store passwords.
 */
async function zipApkAndKey(signedApkPath, pwaSettings, signingKey) {
    console.log("Zipping signed APK and key info...");
    const apkName = `${pwaSettings.name}-signed.apk`;
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
            archive.file(signedApkPath, { name: apkName });
            archive.file(signingKey.keyStorePath, { name: "signing-keystore.keystore" });
            archive.file("./Next-steps.md", { name: "Next-steps.md" });
            archive.append(signingKey.keyStorePassword, { name: "key-store-password.txt" });
            archive.append(signingKey.keyPassword, { name: "key-password.txt" });
            archive.append(signingKey.keyAlias, { name: "key-alias.txt" });
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
                .then((deletedPaths) => { var _a; return console.log("Cleaned up tmp directory", dirPatternToDelete, (_a = deletedPaths) === null || _a === void 0 ? void 0 : _a.length, "subdirectories and files were deleted"); })
                .catch((err) => console.warn("Unable to cleanup tmp directory. It will be cleaned up on process exit", err));
        };
        setTimeout(() => delDir(), tempFileRemovalTimeoutMs);
    }
}
module.exports = router;
//# sourceMappingURL=project.js.map