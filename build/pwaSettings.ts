import { WebManifestShortcutJson } from "@bubblewrap/core/dist/lib/types/WebManifest";

export interface PwaSettings {
    /**
     * The Android package ID to generate, e.g. com.mycompany.foo
     */
    packageId: string;
    /**
     * The URL host for the TWA, e.g. https://foo.com
     */
    host: string;
    /**
     * The Android app name.
     */
    name: string;
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
     * The start url relative to the host.
     */
    startUrl: string;
    /**
     * The URL to the icon to use for the app.
     */
    iconUrl?: string;
    /**
     * The URL to the maskable icon to use for the app.
     */
    maskableIconUrl?: string;
    /**
     * The app version.
     */
    appVersion: string;
    /**
     * The app version code.
     */
    appVersionCode?: number;
    /**
     * Whether to use the browser on Chrome OS.
     */
    useBrowserOnChromeOS: boolean;
    /**
     * How long the splash screen should fade out.
     */
    splashScreenFadeOutDuration: number;
    /**
     * 
     */
    enableNotifications: boolean;
    /**
     * The launcher name.
     */
    launcherName?: string;
    /*
     * App shortcuts
     */
    shortcuts: WebManifestShortcutJson[];
    /**
     * Fallback behavior.
     */
    fallbackType?: 'customtabs' | 'webview';
    /**
     * The URL to the web manifest.
     */
    webManifestUrl: string;
    /**
     * Information about the user and organization to place on the new signing key we'll generate for the user.
     */
    signingInfo: {
        /**
         * The full name of the person to list on the signing key.
         */
        fullName: string;
        /**
         * The organization to list on the signing key, e.g. "Microsoft".
         */
        organization: string;
        /**
         * The organizational unit to list on the signing key, e.g. "Engineering Department".
         */
        organizationalUnit: string;
        /**
         * The 2 letter country code to list on the signing key, e.g. "US".
         */
        countryCode: string;
    }
}