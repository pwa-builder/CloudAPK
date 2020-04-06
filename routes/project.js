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
const router = express_1.default.Router();
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
function validateSettings(settings) {
    if (!settings) {
        return ["No settings supplied"];
    }
    const requiredFields = ["name", "host", "packageId", "iconUrl", "startUrl", "signingInfo", "appVersion"];
    return requiredFields
        .filter(f => !settings[f])
        .map(f => `${f} is required`);
}
async function createSignedApk(pwaSettings) {
    tmp_1.default.setGracefulCleanup();
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
        // Cleanup after ourselves.
        projectDir === null || projectDir === void 0 ? void 0 : projectDir.removeCallback();
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
    return new Promise((resolve, reject) => {
        try {
            const archive = archiver_1.default('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });
            const filename = tmp_1.default.tmpNameSync({
                prefix: "pwabuilder-cloudapk-",
                postfix: ".zip"
            });
            const output = fs_extra_1.default.createWriteStream(filename);
            archive.pipe(output);
            archive.file(signedApkPath, { name: apkName });
            archive.file(signingKey.keyStorePath, { name: "signing-keystore.keystore" });
            archive.file("./Next-steps.md", { name: "Next-steps.md" });
            archive.append(signingKey.keyStorePassword, { name: "key-store-password.txt" });
            archive.append(signingKey.keyPassword, { name: "key-password.txt" });
            archive.append(signingKey.keyAlias, { name: "key-alias.txt" });
            archive.finalize();
            output.on('close', () => {
                resolve(filename);
            });
        }
        catch (err) {
            reject(err);
        }
    });
}
module.exports = router;
//# sourceMappingURL=project.js.map