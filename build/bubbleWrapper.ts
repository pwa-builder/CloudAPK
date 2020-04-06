import { TwaGenerator } from "@bubblewrap/core/dist/lib/TwaGenerator";
import { TwaManifest, TwaManifestJson } from "@bubblewrap/core/dist/lib/TwaManifest";
import { Config } from "@bubblewrap/core/dist/lib/Config";
import { AndroidSdkTools } from "@bubblewrap/core/dist/lib/androidSdk/AndroidSdkTools";
import { JdkHelper } from "@bubblewrap/core/dist/lib/jdk/JdkHelper";
import { GradleWrapper } from "@bubblewrap/core/dist/lib/GradleWrapper";
import fs from "fs-extra";
import { PwaSettings } from "./pwaSettings";
import constants from "../constants";
import { KeyTool, CreateKeyOptions } from "@bubblewrap/core/dist/lib/jdk/KeyTool";
import { SigningKeyInfo } from "./signingKeyInfo";

/*
 * Wraps Google"s bubblewrap to build a signed APK from a PWA.
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
        await this.generateTwaProject();
        await this.createSigningKey();
        const apkPath = await this.buildApk();
        const optimizedApkPath = await this.optimizeApk(apkPath);
        const signedApkPath = await this.signApk(optimizedApkPath);
        return signedApkPath;
    }

    private async generateTwaProject(): Promise<TwaManifest> {
        const twaGenerator = new TwaGenerator();
        const manifestSettings = Object.assign({}, this.pwaSettings)
        const twaManifest = new TwaManifest(this.createManifestSettings(this.pwaSettings, this.signingKeyInfo));
        twaManifest.generatorApp = "PWABuilder";
        //await twaManifest.saveToFile(this.projectDirectory + "/twa-manifest.json");
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
        const signingKey = {
            path: signingKeyInfo.keyStorePath,
            alias: signingKeyInfo.keyAlias
        };
        
        return {...pwaSettings, signingKey: signingKey };
    }
}