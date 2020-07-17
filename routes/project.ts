import express, { response } from "express";
import { BubbleWrapper } from "../build/bubbleWrapper";
import { ApkOptions as ApkOptions } from "../build/apkOptions";
import path from "path";
import tmp, { dir } from "tmp";
import archiver from "archiver";
import fs from "fs-extra";
import { LocalKeyFileSigningOptions, SigningOptions } from "../build/signingOptions";
import del from "del";
import { GeneratedApk } from "../build/generatedApk";
import { ApkRequest } from "../build/apkRequest";
import generatePassword from "password-generator";

const router = express.Router();

const tempFileRemovalTimeoutMs = 1000 * 60 * 5; // 5 minutes
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
    console.info("Generated APK successfully for domain", apkRequest.options.host);
  } catch (err) {
    console.error("Error generating signed APK", err);
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
      response.sendFile(zipFile, {});
    }
    console.info("Process completed successfully.");
  } catch (err) {
    console.error("Error generating signed APK", err);
    response.status(500).send("Error generating signed APK: " + err);
  }
});

function validateApkRequest(request: express.Request): ApkRequest {
  const validationErrors: string[] = [];

  // If we were unable to parse ApkOptions, there's no more validation to do.
  let options: ApkOptions | null = tryParseOptionsFromRequest(request);
  if (!options) {
    validationErrors.push("Malformed argument. Coudn't find ApkOptions in body");
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
      options.signing.keyPassword = generatePassword(12, false);
    }
    if (!options.signing.storePassword) {
      options.signing.storePassword = generatePassword(12, false);
    }

    // Verify we have the required signing options.
    const requiredSigningOptions: Array<keyof SigningOptions> = [
      "alias",
      "countryCode",
      "fullName",
      "keyPassword",
      "organization",
      "organizationalUnit",
      "storePassword"
    ];
    validationErrors.push(...requiredSigningOptions
      .filter(f => !options?.signing![f])
      .map(f => `Signing option ${f} is required`));
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

    // Generate the APK, keys, and digital asset links.
    const bubbleWrapper = new BubbleWrapper(options, projectDirPath, signing);
    return await bubbleWrapper.generateApk();
  } finally {
    // Schedule this directory for cleanup in the near future.
    scheduleTmpDirectoryCleanup(projectDir?.name);
  }
}

async function createLocalSigninKeyInfo(apkSettings: ApkOptions, projectDir: string): Promise<LocalKeyFileSigningOptions | null> {
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

    const fileBuffer = base64ToBuffer(apkSettings.signing.file);
    await fs.promises.writeFile(keyFilePath, fileBuffer);
  }

  function base64ToBuffer(base64: string): Buffer {
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
async function createZipPackage(apk: GeneratedApk, apkOptions: ApkOptions): Promise<string | void> {
  console.info("Zipping APK and key info...");
  const apkName = `${apkOptions.name}${apkOptions.signingMode === "none" ? "-unsigned" : "-signed"}.apk`;
  let tmpZipFile: string | null = null;

  return new Promise((resolve, reject) => {
    try {
      const archive = archiver('zip', {
        zlib: { level: 5 }
      });

      archive.on("warning", function (zipWarning: any) {
        console.warn("Warning during zip creation", zipWarning);
      });
      archive.on("error", function (zipError: any) {
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

      // Append the APK, next steps readme, signing key, and digital asset links.
      const isSigned = !!apk.signingInfo;
      archive.file(apk.filePath, { name: apkName });
      archive.file(isSigned ? "./Next-steps.html" : "./Next-steps-unsigned.html", { name: "Readme.html" });

      // If we've signed it, we should have signing info and digital asset links.
      if (apk.signingInfo && apk.signingInfo.keyFilePath) {
        archive.file(apk.signingInfo.keyFilePath, { name: "signing.keystore" });
        const readmeContents = [
          "Keep your this file and signing.keystore in a safe place. You'll need these files if you want to upload future versions of your PWA to the Google Play Store.\r\n",
          "Key store file: signing.keystore",
          `Key store password: ${apk.signingInfo.storePassword}`,
          `Key alias: ${apk.signingInfo.alias}`,
          `Key password: ${apk.signingInfo.keyPassword}`,
          `Signer's full name: ${apk.signingInfo.fullName}`,
          `Signer's organization: ${apk.signingInfo.organization}`,
          `Signer's organizational unit: ${apk.signingInfo.organizationalUnit}`,
          `Signer's country code: ${apk.signingInfo.countryCode}`
        ];
        archive.append(readmeContents.join("\r\n"), { name: "signing-key-info.txt" });

        // Did we generate digital asset links? If so, include that in the zip too.
        if (apk.assetLinkPath) {
          archive.file(apk.assetLinkPath, { name: "assetlinks.json" });
        }
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
    console.info("Scheduled cleanup for tmp file", file);
    const delFile = function () {
      const filePath = file.replace(/\\/g, "/"); // Use / instead of \ otherwise del gets failed to delete files on Windows
      del([filePath], { force: true })
        .then((deletedPaths: string[]) => console.info("Cleaned up tmp file", deletedPaths))
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
    console.info("Scheduled cleanup for tmp directory", dirPatternToDelete);
    const delDir = function () {
      del([dirPatternToDelete], { force: true }) // force allows us to delete files outside of workspace
        .then((deletedPaths: string[]) => console.info("Cleaned up tmp directory", dirPatternToDelete, deletedPaths?.length, "subdirectories and files were deleted"))
        .catch((err: any) => console.warn("Unable to cleanup tmp directory. It will be cleaned up on process exit", err));
    };
    setTimeout(() => delDir(), tempFileRemovalTimeoutMs);
  }
}

module.exports = router;