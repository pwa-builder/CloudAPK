# CloudApk
Building APK for Android on Docker for PWA


# Build docker image

> docker build . -t cloudapk-image

# Run Docker container

> docker run -p 3000:80 --name cloudapk cloudapk-image

# Generate APKs

Send a POST to `/generateSignedApkZip` with the following JSON arguments:

```json
{
    "packageId": "com.mycompany.myapp",
    "host": "https://contoso.com",
    "name": "My App",
    "themeColor": "#2f3d58",
    "navigationColor": "#2f3d58",
    "backgroundColor": "#2f3d58",
    "startUrl": "/",
    "iconUrl": "https://contoso.com/images/512x512.png",
    "maskableIconUrl": "https://contoso.com/images/maskable512x512.png",
    "appVersion": "1.0.0",
    "useBrowserOnChromeOS": true,
    "splashScreenFadeOutDuration": 300,
    "enableNotifications": false,
    "shortcuts": "[]",
    "signingInfo": {
        "fullName": "John Doe",
        "organization": "Contoso",
        "organizationalUnit": "Engineering Department",
        "countryCode": "US"
    }
}
```

The response will be a zip file containing the signed APK.

Alternately, you can call `/generateSignedApk` to generate only the APK file.