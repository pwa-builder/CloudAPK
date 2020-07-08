# CloudApk
Building APK for Android on Docker for PWA


# Build docker image

> docker build . -t cloudapk-image

# Run Docker container

> docker run -p 3000:80 --name cloudapk cloudapk-image

# Generate APKs

Send a POST to `/generateApkZip` with the following JSON arguments:

```json
{
    "packageId": "com.sadchonks",
    "name": "Sad Chonks",
    "launcherName": "Chonks",
    "appVersion": "1.0.0.0",
    "appVersionCode": 1,
    "display": "standalone",
    "host": "https://sadchonks.com",
    "startUrl": "/saved",
    "webManifestUrl": "https://sadchonks.com/manifest.json",
    "themeColor": "#3f51b5",
    "navigationColor": "#3f51b5",
    "backgroundColor": "#3f51b5",
    "iconUrl": "https://sadchonks.com/kitteh-512.png",
    "maskableIconUrl?": null,
    "monochromeIconUrl?": null,
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
    "enableNotifications": false
}
```

The response will be a zip file containing the signed APK.

Alternately, you can call `/generateSignedApk` to generate only the APK file.

# Running locally
To run the project locally, run `nodemon` from the command line. This will host the server at localhost:3000. It will also monitor .ts files for changes and automatically recompile and reload the server when a change occurs.