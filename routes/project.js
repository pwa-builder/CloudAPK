"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const llamaPackWrapper_1 = require("../build/llamaPackWrapper");
const path_1 = __importDefault(require("path"));
const generate_password_1 = __importDefault(require("generate-password"));
const tmp_1 = __importDefault(require("tmp"));
const router = express_1.default.Router();
router.post("/generateSignedApk", async function (request, response) {
    var _a;
    const pwaSettings = request.body;
    const validationErrors = validateSettings(pwaSettings);
    if (validationErrors.length > 0) {
        response.status(500).send("Invalid settings");
        return;
    }
    let projectDir = null;
    try {
        // Create a new temp folder for the project.
        projectDir = tmp_1.default.dirSync();
        const projectDirPath = projectDir.name;
        // For now, we generate a signing key on behalf of the user. 
        // In the future, we may allow the user to pass in an existing key.
        const signingKey = createSigningKeyInfo(projectDirPath, pwaSettings);
        // Generate the signed APK.
        const llama = new llamaPackWrapper_1.LlamaPackWrapper(pwaSettings, projectDirPath, signingKey);
        const signedApkPath = await llama.generateApk();
        // Zip up the APK, signing key, and readme.txt
        response.sendFile(signedApkPath);
    }
    catch (err) {
        console.log("Error generating signed APK", err);
        response.status(500).send("Error generating signed APK: " + err);
    }
    finally {
        // Cleanup our temporary directory.
        (_a = projectDir) === null || _a === void 0 ? void 0 : _a.removeCallback();
    }
});
function validateSettings(settings) {
    if (!settings) {
        return ["No settings supplied"];
    }
    return [];
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
module.exports = router;
//# sourceMappingURL=project.js.map