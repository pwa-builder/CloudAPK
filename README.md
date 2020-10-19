# CloudApk
This is PWABuilder's Android platform that generates an Android app package from a Progressive Web App using Android's Trusted Web Activity technology.

We utilize [Google's Bubblewrap](https://github.com/googlechromelabs/bubblewrap) to generate and sign an Android app package. 

This tool generates a zip file containing both an `.apk` file (for testing) and an `.aab` file (for submission to Google Play Store).

# Running locally

Run `npm start dev`, then launch your browser to localhost:3333. A page will launch that allows you to generate an Android package.

You may also generate a package manually by sending a POST to `/generateAppPackage` with the following JSON body:

```json
{
    "packageId": "com.sadchonks",
    "name": "Sad Chonks",
    "launcherName": "Chonks",
    "appVersion": "1.0.0.0",
    "appVersionCode": 1,
    "display": "standalone",
    "host": "https://sadchonks.com",
    "iconUrl": "https://sadchonks.com/kitteh-512.png",
    "includeSourceCode": false,
    "isChromeOSOnly": false,
    "startUrl": "/saved",
    "webManifestUrl": "https://sadchonks.com/manifest.json",
    "themeColor": "#3f51b5",
    "navigationColor": "#3f51b5",
    "navigationColorDark": "#3f51b5",
    "navigationDividerColor": "#3f51b5",
    "navigationDividerColorDark": "#3f51b5",
    "backgroundColor": "#3f51b5",
    "maskableIconUrl": null,
    "monochromeIconUrl": null,
    "shortcuts": [{
        "name": "New Chonks",
        "short_name": "New",
        "url": "/?shortcut",
        "icons": [
            {
                "sizes": "128x128",
                "src": "/favicon.png"
            }
        ]
    }],
    "signingMode": "none",
    "signing": null,
    "fallbackType": "customtabs",
    "splashScreenFadeOutDuration": 300,
    "enableNotifications": false,
    "enableSiteSettingsShortcut": true
}
```

The response will be a zip file containing the generated app.

# More info

Once an Android app package has been generated, follow the steps on [Next Steps](Next-steps.md).