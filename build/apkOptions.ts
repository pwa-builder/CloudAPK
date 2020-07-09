import { WebManifestShortcutJson } from "@bubblewrap/core/dist/lib/types/WebManifest";
import { SigningOptions } from "./signingOptions";

export type ApkOptions = {
    /**
     * The Android package ID to generate, e.g. com.mycompany.foo
     */
    packageId: string;
    /**
     * The Android app name.
     */
    name: string;
    /**
     * The name of the app used on the Android launch screen. This may be the same as name or may be a shortened version of that name to account for less available display space.
     */
    launcherName: string;
    /**
     * The app version.
     */
    appVersion: string;
    /**
     * The app version code.
     */
    appVersionCode: number;
        /**
     * Display mode.
     */
    display: "standalone" | "fullscreen";
    /**
     * The URL host for the TWA, e.g. https://foo.com
     */
    host: string;
    /**
     * The start url relative to the host.
     */
    startUrl: string;
    /**
     * The URL to the web manifest.
     */
    webManifestUrl: string;
    /**
     * The app theme color, e.g. #2f3d58. See https://developers.google.com/web/updates/2015/08/using-manifest-to-set-sitewide-theme-color
     */
    themeColor: string;
    /**
     * The app navigation color.
     */
    navigationColor: string;
    /**
     * The app background color.
     */
    backgroundColor: string;
    /**
     * The URL to the icon to use for the app.
     */
    iconUrl: string;
    /**
     * The URL to the maskable icon to use for the app.
     */
    maskableIconUrl?: string;
    /**
     * The URL to a monochrome icon to use for the app.
     */
    monochromeIconUrl?: string;
    /*
     * App shortcuts
     */
    shortcuts: WebManifestShortcutJson[];
    /**
     * The signing operation to perform. "new" means create a new signing key. "none" means don't sign. "mine" means use the uploaded signing information.
     * If "new" in specified, then .signing must contain the details of the signing key.
     * If "mine" is specified, then .signing must contain the .signing.file and details of the signing key.
     */
    signingMode: "new" | "none" | "mine";
    /**
     * Details about the signing key. 
     * If .signingMode = "none", this will be ignored.
     * If .signingMode = "new", this must contain the signing details, but .signing.file will be ignored.
     * If .signingMode = "mine", this must contain the signing details and key file.
     */
    signing?: SigningOptions | null;
    /**
     * Fallback behavior. "customtabs" = use Chrome's Custom Tabs feature as a fallback. "webview" = use a embedded web view as a fallback behavior.
     */
    fallbackType?: 'customtabs' | 'webview';
    /**
     * How long the splash screen should fade out in milliseconds
     */
    splashScreenFadeOutDuration: number;
    /**
     * Whether to use Push Notification Delegation. If enabled, the TWA will be able to send push notifications without browser permission prompts.
     */
    enableNotifications: boolean;
}