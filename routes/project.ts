import { Request } from "express";
import express from "express";
import { LlamaPackWrapper } from "../build/llamaPackWrapper";
import { PwaSettings } from "../build/pwaSettings";
import { tmpdir } from "os";
import path from "path";
import passwordGenerator from "generate-password";
import tmp from "tmp";

const router = express.Router();

router.post("/generateSignedApk", async function (request: express.Request, response: express.Response) {
  
  const pwaSettings: PwaSettings = request.body;
  const validationErrors = validateSettings(pwaSettings);
  if (validationErrors.length > 0) {
    response.status(500).send("Invalid settings");
    return;
  }

  let projectDir: tmp.DirResult | null = null;
  try {
    // Create a new temp folder for the project.
    projectDir = tmp.dirSync();
    const projectDirPath = projectDir.name;
    
    // For now, we generate a signing key on behalf of the user. 
    // In the future, we may allow the user to pass in an existing key.
    const signingKey = createSigningKeyInfo(projectDirPath, pwaSettings);

    // Generate the signed APK.
    const llama = new LlamaPackWrapper(pwaSettings, projectDirPath, signingKey);
    const signedApkPath = await llama.generateApk();

    // Zip up the APK, signing key, and readme.txt
    response.sendFile(signedApkPath);
  } catch (err) {
    console.log("Error generating signed APK", err);
    response.status(500).send("Error generating signed APK: " + err);
  } finally {
    // Cleanup our temporary directory.
    projectDir?.removeCallback();
  }
});

function validateSettings(settings?: PwaSettings): string[] {
  if (!settings) {
    return ["No settings supplied"];
  }

  return [];
}

function createSigningKeyInfo(projectDirectory: string, pwaSettings: PwaSettings): SigningKeyInfo {
  return {
    keyStorePath: path.join(projectDirectory, "my-signing-key.keystore"),
    keyStorePassword: passwordGenerator.generate({ length: 12, numbers: true }),
    keyAlias: "my-key-alias",
    keyPassword: passwordGenerator.generate({ length: 12, numbers: true }),
    firstAndLastName: pwaSettings.signingInfo.fullName,
    organization: pwaSettings.signingInfo.organization,
    organizationalUnit: pwaSettings.signingInfo.organizationalUnit,
    countryCode: pwaSettings.signingInfo.countryCode 
  }
}

module.exports = router;