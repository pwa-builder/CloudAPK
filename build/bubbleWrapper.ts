import { AndroidSdkTools, Config, DigitalAssetLinks, GradleWrapper, JdkHelper, TwaGenerator,
     TwaManifest, 
     JarSigner} from "@bubblewrap/core";
import { ShortcutInfo } from "@bubblewrap/core/dist/lib/ShortcutInfo";
import { TwaManifestJson, SigningKeyInfo } from "@bubblewrap/core/dist/lib/TwaManifest";
import { findSuitableIcon } from "@bubblewrap/core/dist/lib/util";
import { AndroidPackageOptions } from "./androidPackageOptions";
import fs from "fs-extra";
import { KeyTool, CreateKeyOptions } from "@bubblewrap/core/dist/lib/jdk/KeyTool";
import { WebManifestShortcutJson } from "@bubblewrap/core/dist/lib/types/WebManifest";
import { LocalKeyFileSigningOptions } from "./signingOptions";
import { GeneratedAppPackage } from "./generatedAppPackage";

/*
 * Wraps Google's bubblewrap to build a signed APK from a PWA.
 * https://github.com/GoogleChromeLabs/bubblewrap/tree/master/packages/core
 */
export class BubbleWrapper { 

    private javaConfig: Config;
    private jdkHelper: JdkHelper;
    private androidSdkTools: AndroidSdkTools;

    /**
     * 
     * @param apkSettings The settings for the APK generation.
     * @param projectDirectory The directory where to generate the project files and signed APK.
     * @param signingKeyInfo Information about the signing key.
     */
    constructor(
        private apkSettings: AndroidPackageOptions, 
        private projectDirectory: string, 
        private signingKeyInfo: LocalKeyFileSigningOptions | null) {

        this.javaConfig = new Config(process.env.JDK8PATH!, process.env.ANDROIDTOOLSPATH!);
        this.jdkHelper = new JdkHelper(process, this.javaConfig);
        this.androidSdkTools = new AndroidSdkTools(process, this.javaConfig, this.jdkHelper);
    }

    /**
     * Generates app package from the PWA.
     */
    async generateAppPackage(): Promise<GeneratedAppPackage> {  
        // Create an optimized APK.      
        await this.generateTwaProject();
        const apkPath = await this.buildApk();
        const optimizedApkPath = await this.optimizeApk(apkPath);

        // Do we have a signing key?
        // If so, sign the APK, generate digital asset links file, and generate an app bundle.
        if (this.apkSettings.signingMode !== "none" && this.signingKeyInfo) {
            const signedApkPath = await this.signApk(optimizedApkPath, this.signingKeyInfo);
            const assetLinksPath = await this.tryGenerateAssetLinks(this.signingKeyInfo);
            const appBundlePath = await this.buildAppBundle(this.signingKeyInfo);
            return {
                projectDirectory: this.projectDirectory,
                appBundleFilePath: appBundlePath,
                apkFilePath: signedApkPath,
                signingInfo: this.signingKeyInfo,
                assetLinkFilePath: assetLinksPath
            }
        }

        // We generated an unsigned APK, so there will be no signing info, asset links, or app bundle.
        return {
            projectDirectory: this.projectDirectory,
            apkFilePath: optimizedApkPath,
            signingInfo: this.signingKeyInfo,
            assetLinkFilePath: null,
            appBundleFilePath: null,
        }
    }

    private async buildAppBundle(signingInfo: LocalKeyFileSigningOptions): Promise<string> {
        console.info("Generating app bundle");

        // Build the app bundle file (.aab)
        const gradleWrapper = new GradleWrapper(process, this.androidSdkTools, this.projectDirectory);
        await gradleWrapper.bundleRelease();

        // Sign the app bundle file.
        const appBundleDir = "app/build/outputs/bundle/release";
        const inputFile = `${this.projectDirectory}/${appBundleDir}/app-release.aab`;
        //const outputFile = './app-release-signed.aab';
        const outputFile = `${this.projectDirectory}/${appBundleDir}/app-release-signed.aab`;
        const jarSigner = new JarSigner(this.jdkHelper);
        const jarSigningInfo: SigningKeyInfo = {
            path: signingInfo.keyFilePath,
            alias: signingInfo.alias
        };
        await jarSigner.sign(
            jarSigningInfo, 
            signingInfo.storePassword, 
            signingInfo.keyPassword, 
            inputFile, 
            outputFile
        );
        return outputFile;
      }

    private async generateTwaProject(): Promise<TwaManifest> {
        const twaGenerator = new TwaGenerator();
        const twaManifest = this.createTwaManifest(this.apkSettings);
        await twaGenerator.createTwaProject(this.projectDirectory, twaManifest);
        return twaManifest;
    }

    private async createSigningKey(signingInfo: LocalKeyFileSigningOptions) {
        const keyTool = new KeyTool(this.jdkHelper);
        const overwriteExisting = true;
        if (!signingInfo.fullName || !signingInfo.organization || !signingInfo.organizationalUnit || !signingInfo.countryCode) {
            throw new Error(`Missing required signing info. Full name: ${signingInfo.fullName}, Organization: ${signingInfo.organization}, Organizational Unit: ${signingInfo.organizationalUnit}, Country Code: ${signingInfo.countryCode}.`);
        }

        const keyOptions: CreateKeyOptions = {
            path: signingInfo.keyFilePath,
            password: signingInfo.storePassword,
            keypassword: signingInfo.keyPassword,
            alias: signingInfo.alias,
            fullName: signingInfo.fullName,
            organization: signingInfo.organization,
            organizationalUnit: signingInfo.organizationalUnit,
            country: signingInfo.countryCode
        };
        
        await keyTool.createSigningKey(keyOptions, overwriteExisting);
    }

    private async buildApk(): Promise<string> {
        const gradleWrapper = new GradleWrapper(process, this.androidSdkTools, this.projectDirectory);
        await gradleWrapper.assembleRelease();
        return `${this.projectDirectory}/app/build/outputs/apk/release/app-release-unsigned.apk`;
    }

    private async optimizeApk(apkFilePath: string): Promise<string> {
        console.info("Optimizing the APK...");
        const optimizedApkPath = `${this.projectDirectory}/app-release-unsigned-aligned.apk`;
        await this.androidSdkTools.zipalign(
            apkFilePath, // input file
            optimizedApkPath, // output file
        );

        return optimizedApkPath;
    }

    private async signApk(apkFilePath: string, signingInfo: LocalKeyFileSigningOptions): Promise<string> {
        // Create a new signing key if necessary.
        if (this.apkSettings.signingMode === "new") {
            await this.createSigningKey(signingInfo);
        }
        
        const outputFile = `${this.projectDirectory}/app-release-signed.apk`;
        console.info("Signing the APK...");
        await this.androidSdkTools.apksigner(
            signingInfo.keyFilePath,
            signingInfo.storePassword,
            signingInfo.alias,
            signingInfo.keyPassword,
            apkFilePath, 
            outputFile
        );

        return outputFile;
    }

    async tryGenerateAssetLinks(signingInfo: LocalKeyFileSigningOptions): Promise<string | null> {
        try {
            const result = await this.generateAssetLinks(signingInfo);
            return result;
        } catch (error) {
            console.warn("Asset links couldn't be generated. Proceeding without asset links.", error)
            return null;
        }
    }

    async generateAssetLinks(signingInfo: LocalKeyFileSigningOptions): Promise<string> {
        console.info("Generating asset links...");
        const keyTool = new KeyTool(this.jdkHelper);
        const assetLinksFilePath = `${this.projectDirectory}/app/build/outputs/apk/release/assetlinks.json`;
        const keyInfo = await keyTool.keyInfo({
            path: signingInfo.keyFilePath,
            alias: signingInfo.alias,
            keypassword: signingInfo.keyPassword,
            password: signingInfo.storePassword,
        });

        const sha256Fingerprint = keyInfo.fingerprints.get('SHA256');
        if (!sha256Fingerprint) {
            throw new Error("Couldn't find SHA256 fingerprint.");
        }

        const assetLinks = DigitalAssetLinks.generateAssetLinks(this.apkSettings.packageId, sha256Fingerprint);
        await fs.promises.writeFile(assetLinksFilePath, assetLinks);
        console.info(`Digital Asset Links file generated at ${assetLinksFilePath}`);
        return assetLinksFilePath;
    }

    private createTwaManifest(pwaSettings: AndroidPackageOptions): TwaManifest {
        // Bubblewrap expects a TwaManifest object.
        // We create one using our ApkSettings and signing key info.

        // Host without HTTPS: this is needed because the current version of Bubblewrap doesn't handle
        // a host with protocol specified. Remove the protocol here. See https://github.com/GoogleChromeLabs/bubblewrap/issues/227
        // NOTE: we cannot use new URL(pwaSettings.host).host, because this breaks PWAs located at subpaths, e.g. https://ics.hutton.ac.uk/gridscore
        const host = new URL(pwaSettings.host);
        const hostProtocol = `${host.protocol}//`;
        let hostWithoutHttps = host.href.substr(hostProtocol.length);

        // Trim any trailing slash from the host. See https://github.com/pwa-builder/PWABuilder/issues/1221
        if (hostWithoutHttps.endsWith("/")) {
            hostWithoutHttps = hostWithoutHttps.substr(0, hostWithoutHttps.length - 1);
        }

        const signingKey = {
            path: this.signingKeyInfo?.keyFilePath || "",
            alias: this.signingKeyInfo?.alias || ""
        };
        const manifestJson: TwaManifestJson = {
            ...pwaSettings,
            host: hostWithoutHttps,
            shortcuts: this.createShortcuts(pwaSettings.shortcuts, pwaSettings.webManifestUrl),
            signingKey: signingKey,
            generatorApp: "PWABuilder"
        };
        const twaManifest = new TwaManifest(manifestJson);
        console.info("TWA manifest created", twaManifest);
        return twaManifest;
    }

    private createShortcuts(shortcutsJson: WebManifestShortcutJson[], manifestUrl: string): ShortcutInfo[] {
        if (!manifestUrl) {
            console.warn("Skipping app shortcuts due to empty manifest URL", manifestUrl);
            return [];
        }
        
        const maxShortcuts = 4;
        return shortcutsJson
            .filter(s => this.isValidShortcut(s))
            .map(s => this.createShortcut(s, manifestUrl))
            .slice(0, 4);
    }

    private createShortcut(shortcut: WebManifestShortcutJson, manifestUrl: string): ShortcutInfo {
        const shortNameMaxSize = 12;
        const name = shortcut.name || shortcut.short_name;
        const shortName = shortcut.short_name || shortcut.name!.substring(0, shortNameMaxSize);
        const url = new URL(shortcut.url!, manifestUrl).toString();
        const suitableIcon = findSuitableIcon(shortcut.icons!, "any");
        const iconUrl = new URL(suitableIcon!.src, manifestUrl).toString();
        return new ShortcutInfo(name!, shortName!, url, iconUrl);
    }

    private isValidShortcut(shortcut: WebManifestShortcutJson | null | undefined): boolean {
        if (!shortcut) {
            console.warn("Shortcut is invalid due to being null or undefined", shortcut);
            return false;
        }
        if (!shortcut.icons) {
            console.warn("Shorcut is invalid due to not having any icons specified", shortcut);
            return false;
        }
        if (!shortcut.url) {
            console.warn("Shortcut is invalid due to not having a URL", shortcut);
            return false;
        }
        if (!shortcut.name && !shortcut.short_name) {
            console.warn("Shortcut is invalid due to having neither a name nor short_name", shortcut);
            return false;
        }
        if(!findSuitableIcon(shortcut.icons, 'any')) {
            console.warn("Shortcut is invalid due to not finding a suitable icon", shortcut.icons);
            return false;
        }
        
        return true;
    }
}