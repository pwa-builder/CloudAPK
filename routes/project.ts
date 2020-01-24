import { Request } from "express";
import express from "express";
import { LlamaPackWrapper } from "../build/llamaPackWrapper";
import { PwaSettings } from "../build/pwaSettings";
import { tmpdir } from "os";
import path from "path";
import passwordGenerator from "generate-password";
import tmp from "tmp";
import archiver from "archiver";
import fs from "fs-extra";

const router = express.Router();

router.post("/generateSignedApk", async function (request: express.Request, response: express.Response) {
  
  const pwaSettings: PwaSettings = request.body;
  const validationErrors = validateSettings(pwaSettings);
  if (validationErrors.length > 0) {
    response.status(500).send("Invalid PWA settings: " + validationErrors.join(", "));
    return;
  }

  let projectDir: tmp.DirResult | null = null;
  try {
    // Create a new temp folder for the project.
    tmp.setGracefulCleanup();
    projectDir = tmp.dirSync({ prefix: "pwabuilder-cloudapk-"});
    const projectDirPath = projectDir.name;
    
    // For now, we generate a signing key on behalf of the user. 
    // In the future, we may allow the user to pass in an existing key.
    const signingKey = createSigningKeyInfo(projectDirPath, pwaSettings);

    // Generate the signed APK.
    const llama = new LlamaPackWrapper(pwaSettings, projectDirPath, signingKey);
    const signedApkPath = await llama.generateApk();

    // Zip up the APK, signing key, and readme.txt
    const zipFile = await zipApkAndKey(signedApkPath, pwaSettings, signingKey);
    response.sendFile(zipFile);
    console.log("Process completed successfully.");
  } catch (err) {
    console.log("Error generating signed APK", err);
    response.status(500).send("Error generating signed APK: " + err);
  } finally {
    // Cleanup our temporary files.
    projectDir?.removeCallback();
  }
});

function validateSettings(settings?: PwaSettings): string[] {
  if (!settings) {
    return ["No settings supplied"];
  } 
  
  const requiredFields: Array<keyof PwaSettings> = ["name", "host", "packageId", "iconUrl", "startUrl", "signingInfo", "appVersion"];
  return requiredFields
    .filter(f => !settings[f])
    .map(f => `${f} is required`);
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

/***
 * Creates a zip file containing the signed APK, key store and key store passwords.
 */
async function zipApkAndKey(signedApkPath: string, pwaSettings: PwaSettings, signingKey: SigningKeyInfo): Promise<string> {
  console.log("Zipping signed APK and key info...");
  const apkName = `${pwaSettings.name}-signed.apk`;
  const zipStream = archiver("zip");
  const zipFile = tmp.tmpNameSync({
    prefix: "pwabuilder-cloudapk-",
    postfix: ".zip"
  });
  const fileStream = fs.createWriteStream(zipFile); 
  zipStream.pipe(fileStream);
  await zipStream
    .file(signedApkPath, { name: apkName })
    .file(signingKey.keyStorePath, { name: "signing-keystore.keystore" })
    .file("./Next-steps.md", { name: "Next-steps.md" })
    .append(signingKey.keyStorePassword, { name: "key-store-password.txt" })
    .append(signingKey.keyPassword, { name: "key-password.txt" })
    .append(signingKey.keyAlias, { name: "key-alias.txt" })
    .finalize();
  return zipFile;
}

module.exports = router;