import express, { response } from "express";
import { BubbleWrapper } from "../build/bubbleWrapper";
import { ApkOptions as ApkOptions } from "../build/apkOptions";
import path from "path";
import tmp, { dir } from "tmp";
import archiver from "archiver";
import fs from "fs-extra";
import { LocalKeyFileSigningOptions } from "../build/signingOptions";
import del from "del";
import { GeneratedApk } from "../build/generatedApk";
import { ApkRequest } from "../build/apkRequest";

const router = express.Router();

const tempFileRemovalTimeoutMs = 1000 * 60 * 30; // 30 minutes
tmp.setGracefulCleanup(); // remove any tmp file artifacts on process exit

/**
 * Generates and sends back an APK file. 
 * Expects a POST body containing @see ApkOptions object.
 */
router.post("/generateApk", async function (request: express.Request, response: express.Response) {
  const apkRequest = validateApkRequest(request);
  if (apkRequest.validationErrors.length > 0 || !apkRequest.options) {
    response.status(500).send("Invalid PWA settings: " + apkRequest.validationErrors.join(", "));
    return;
  }

  try {
    const apk = await createApk(apkRequest.options);
    response.sendFile(apk.filePath);
    console.log("Generated APK successfully for domain", apkRequest.options.host);
  } catch (err) {
    console.log("Error generating signed APK", err);
    response.status(500).send("Error generating signed APK: " + err);
  }
});

/**
 * Generates an APK package and zips it up along with the signing key info. Sends back the zip file. 
 * Expects a POST body containing @see ApkOptions form data.
 */
router.post("/generateApkZip", async function (request: express.Request, response: express.Response) {
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
      response.sendFile(zipFile);
    }
    console.log("Process completed successfully.");
  } catch (err) {
    console.log("Error generating signed APK", err);
    response.status(500).send("Error generating signed APK: " + err);
  }
});

router.post("/generatePackage", async function (request: express.Request, response: express.Response) {
  const body = request.body;
  const files = request.files;
  console.log("body and files", body, files);
  const result = validateApkRequest(request);
  response.send("OK");
});

function validateApkRequest(request: express.Request): ApkRequest {
  const validationErrors: string[] = [];

  // If we were unable to parse ApkOptions, there's no more validation to do.
  let options: ApkOptions | null = tryParseOptionsFromRequest(request);
  if (!options) {
    validationErrors.push("Couldn't parse ApkOptions from body.options.");
    return {
      options: null,
      validationErrors,
    } 
  }

  // Ensure we have required fields.
  const requiredFields: Array<keyof ApkOptions> = [
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
    .filter(f => !options![f])
    .map(f => `${f} is required`));

  // We must have signing options if the signing is enabled.
  if (options.signingMode !== "none" && !options.signing) {
    validationErrors.push(`Signing options are required when signing mode = '${options.signingMode}'`);
  }

  // We must have a keystore file uploaded if the signing mode is use existing.
  if (options.signingMode === "mine" && !options.signing?.file) {
    validationErrors.push("You must supply a signing key file when signing mode = 'mine'");
  }

  return {
    options: options,
    validationErrors
  };
}

function tryParseOptionsFromRequest(request: express.Request): ApkOptions | null {
  // See if the body is our options request.
  if (request.body["packageId"]) {
    return request.body as ApkOptions;
  }

  return null;
}

async function createApk(options: ApkOptions): Promise<GeneratedApk> {
  let projectDir: tmp.DirResult | null = null;
  try {
    // Create a temporary directory where we'll do all our work.
    projectDir = tmp.dirSync({ prefix: "pwabuilder-cloudapk-" });
    const projectDirPath = projectDir.name;
    
    // Get the signing information.
    const signing = await createLocalSigninKeyInfo(options, projectDirPath);

    // Generate the signed APK.
    const bubbleWrapper = new BubbleWrapper(options, projectDirPath, signing);
    const apkPath = await bubbleWrapper.generateApk();
    return {
      filePath: apkPath,
      signingInfo: signing
    };
  } finally {
    // Schedule this directory for cleanup in the near future.
    scheduleTmpDirectoryCleanup(projectDir?.name);
  }
}

async function createLocalSigninKeyInfo(apkSettings: ApkOptions, projectDir: string) : Promise<LocalKeyFileSigningOptions | null> {
  // If we're told not to sign it, skip this.
  if (apkSettings.signingMode === "none") {
    return null;
  }
  
  // Did the user upload a key file for signing? If so, download it to our directory.
  const keyFilePath = path.join(projectDir, "signingKey.keystore");
  if (apkSettings.signingMode === "mine") {
    if (!apkSettings.signing?.file) {
      throw new Error("Signing mode is 'mine', but no signing key file was supplied.");
    }

    const fileBuffer = new Buffer(apkSettings.signing.file);
    await fs.promises.writeFile(keyFilePath, fileBuffer);
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
async function createZipPackage(apk: GeneratedApk, apkOptions: ApkOptions): Promise<string | void> {
  console.log("Zipping APK and key info...");
  const apkName = `${apkOptions.name}-signed.apk`;
  let tmpZipFile: string | null = null;

  return new Promise((resolve, reject) => {
    try {
      const archive = archiver('zip', {
        zlib: { level: 5 }
      });

      archive.on("warning", function(zipWarning: any) {
        console.warn("Warning during zip creation", zipWarning);
      });
      archive.on("error", function(zipError: any) {
        console.error("Error during zip creation", zipError);
        reject(zipError);
      });

      tmpZipFile = tmp.tmpNameSync({
        prefix: "pwabuilder-cloudapk-",
        postfix: ".zip"
      });
      const output = fs.createWriteStream(tmpZipFile);
      output.on('close', () => {
        if (tmpZipFile) {
          resolve(tmpZipFile);
        } else {
          reject("No zip file was created");
        }
      });

      archive.pipe(output);

      // Append the APK, next steps readme, and signing key.
      archive.file(apk.filePath, { name: apkName });
      archive.file("./Next-steps.md", { name: "Next-steps.md" });
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
    } catch (err) {
      reject(err);
    } finally {
      scheduleTmpFileCleanup(tmpZipFile);
    }
  })
}

function scheduleTmpFileCleanup(file: string | null) {
  if (file) {
    console.log("scheduled cleanup for tmp file", file);
    const delFile = function() {
      const filePath = file.replace(/\\/g, "/"); // Use / instead of \ otherwise del gets failed to delete files on Windows
      del([filePath], { force: true })
        .then((deletedPaths: string[]) => console.log("Cleaned up tmp file", deletedPaths))
        .catch((err: any) => console.warn("Unable to cleanup tmp file. It will be cleaned up on process exit", err, filePath));
    }
    setTimeout(() => delFile(), tempFileRemovalTimeoutMs);
  }
}

function scheduleTmpDirectoryCleanup(dir?: string | null) {
  // We can't use dir.removeCallback() because it will fail with "ENOTEMPTY: directory not empty" error.
  // We can't use fs.rmdir(path, { recursive: true }) as it's supported only in Node 12+, which isn't used by our docker image.

  if (dir) {
    const dirToDelete = dir.replace(/\\/g, "/"); // Use '/' instead of '\', otherwise del gets confused and won't cleanup on Windows.
    const dirPatternToDelete = dirToDelete + "/**"; // Glob pattern to delete subdirectories and files
    console.log("scheduled cleanup for tmp directory", dirPatternToDelete);
    const delDir = function() {
      del([dirPatternToDelete], { force: true }) // force allows us to delete files outside of workspace
        .then((deletedPaths: string[]) => console.log("Cleaned up tmp directory", dirPatternToDelete, deletedPaths?.length, "subdirectories and files were deleted"))
        .catch((err: any) => console.warn("Unable to cleanup tmp directory. It will be cleaned up on process exit", err));        
    };
    setTimeout(() => delDir(), tempFileRemovalTimeoutMs);
  }
}

module.exports = router;