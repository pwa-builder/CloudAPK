import { TwaGenerator } from "@bubblewrap/core/dist/lib/TwaGenerator";
import { TwaManifest, TwaManifestJson, ShortcutInfo } from "@bubblewrap/core/dist/lib/TwaManifest";
import { findSuitableIcon } from "@bubblewrap/core/dist/lib/util";
import { Config } from "@bubblewrap/core/dist/lib/Config";
import { AndroidSdkTools } from "@bubblewrap/core/dist/lib/androidSdk/AndroidSdkTools";
import { JdkHelper } from "@bubblewrap/core/dist/lib/jdk/JdkHelper";
import { GradleWrapper } from "@bubblewrap/core/dist/lib/GradleWrapper";
import fs from "fs-extra";
import { PwaSettings } from "./pwaSettings";
import constants from "../constants";
import { KeyTool, CreateKeyOptions } from "@bubblewrap/core/dist/lib/jdk/KeyTool";
import { SigningKeyInfo } from "./signingKeyInfo";
import { WebManifestShortcutJson } from "@bubblewrap/core/dist/lib/types/WebManifest";

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
     * @param pwaSettings The settings for the PWA.
     * @param projectDirectory The directory where to generate the project files and signed APK.
     * @param signingKeyInfo Information about the signing key.
     * @param jdkPath The path to the JDK.
     * @param androidToolsPath The path to the Android Build tooks.
     */
    constructor(
        private pwaSettings: PwaSettings, 
        private projectDirectory: string, 
        private signingKeyInfo: SigningKeyInfo) {

        this.javaConfig = new Config(constants.JDK_PATH, constants.ANDROID_TOOLS_PATH);
        this.jdkHelper = new JdkHelper(process, this.javaConfig);
        this.androidSdkTools = new AndroidSdkTools(process, this.javaConfig, this.jdkHelper);
    }

    /**
     * Generates a signed APK from the PWA.
     */
    async generateApk(): Promise<string> {        
        const unsignedApkPath = await this.generateUnsignedApk();
        const signedApkPath = await this.signApk(unsignedApkPath);
        return signedApkPath;
    }

    /**
     * Generates an unsigned APK from the PWA.
     */
    async generateUnsignedApk(): Promise<string> {
      await this.generateTwaProject();
      const apkPath = await this.buildApk();
      const optimizedApkPath = await this.optimizeApk(apkPath);
      return optimizedApkPath;
    }

    private async generateTwaProject(): Promise<TwaManifest> {
        const twaGenerator = new TwaGenerator();
        const twaManifestJson = this.createManifestSettings(this.pwaSettings, this.signingKeyInfo);
        const twaManifest = new TwaManifest(twaManifestJson);
        twaManifest.generatorApp = "PWABuilder";
        await twaGenerator.createTwaProject(this.projectDirectory, twaManifest);
        return twaManifest;
    }

    private async createSigningKey() {
        // Delete existing signing key.
        if (fs.existsSync(this.signingKeyInfo.keyStorePath)) {
            await fs.promises.unlink(this.signingKeyInfo.keyStorePath);
        }

        const keyTool = new KeyTool(this.jdkHelper);
        const overwriteExisting = true;
        const keyOptions: CreateKeyOptions = {
            path: this.signingKeyInfo.keyStorePath,
            password: this.signingKeyInfo.keyStorePassword,
            keypassword: this.signingKeyInfo.keyPassword,
            alias: this.signingKeyInfo.keyAlias,
            fullName: this.signingKeyInfo.firstAndLastName,
            organization: this.signingKeyInfo.organization,
            organizationalUnit: this.signingKeyInfo.organizationalUnit,
            country: this.signingKeyInfo.countryCode
        };
        
        await keyTool.createSigningKey(keyOptions, overwriteExisting);
    }

    private async buildApk(): Promise<string> {
        const gradleWrapper = new GradleWrapper(process, this.androidSdkTools, this.projectDirectory);
        await gradleWrapper.assembleRelease();
        return `${this.projectDirectory}/app/build/outputs/apk/release/app-release-unsigned.apk`;
    }

    private async optimizeApk(apkFilePath: string): Promise<string> {
        console.log("Optimizing the APK...");
        const optimizedApkPath = `${this.projectDirectory}/app-release-unsigned-aligned.apk`;
        await this.androidSdkTools.zipalign(
            apkFilePath, // input file
            optimizedApkPath, // output file
        );

        return optimizedApkPath;
    }

    private async signApk(apkFilePath: string): Promise<string> {
        await this.createSigningKey();
        const outputFile = `${this.projectDirectory}/app-release-signed.apk`;
        console.log("Signing the APK...");
        await this.androidSdkTools.apksigner(
            this.signingKeyInfo.keyStorePath,
            this.signingKeyInfo.keyStorePassword,
            this.signingKeyInfo.keyAlias,
            this.signingKeyInfo.keyPassword,
            apkFilePath, 
            outputFile
        );

        return outputFile;
    }

    private createManifestSettings(pwaSettings: PwaSettings, signingKeyInfo: SigningKeyInfo): TwaManifestJson {
        // Bubblewrap expects a TwaManifestJson object.
        // We create one using our settings and signing key.

        const signingKey = {
            path: signingKeyInfo.keyStorePath,
            alias: signingKeyInfo.keyAlias
        };
        const manifestJson: TwaManifestJson = {
            ...pwaSettings,
            shortcuts: this.createShortcuts(pwaSettings.shortcuts, pwaSettings.webManifestUrl),
            signingKey: signingKey
        };
        return manifestJson;
    }

    private createShortcuts(shortcutsJson: WebManifestShortcutJson[], manifestUrl: string): ShortcutInfo[] {
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