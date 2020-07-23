# Next steps for getting your PWA into the Google Play Store
You've successfully generated a Google Play Store app package (`.apk` file) for your PWA. 😎

Your next steps:
1. Deploy `assetlinks.json` to your server.
2. Test your package on an Android device or Android emulator.
3. Upload your `apk` file to the Google Play Store.

Each step is explained below.

## 1. Deploy `assetlinks.json`

While this step is optional, skipping it will cause Android to display a browser addres bar in your app. 

A [Digital Asset Links](https://developers.google.com/web/updates/2019/08/twas-quickstart#creating-your-asset-link-file) file proves you own your PWA's domain.

Your zip file contains `assetlinks.json`. Upload this file to your server at `https://example.com/.well-known/assetlinks.json`. (Replace example.com with your PWA's URL.)

> 💁‍♂️ *Heads up*: <br /><br />**Digital asset links are required for your PWA to load without the browser address bar**. If you're seeing a browser address bar in your app on Android, your `assetlinks.json` file is missing, inaccessible, or incorrect. See our [asset links helper](/asset-links.md) to fix issues with the browser address bar showing up in your app.

## 2. Test your APK on an Android device or Android emulator
Your zip file contains an `.apk` file - this is the Android app package that you can run on an Android device and you can submit to the Google Play Store.

To test your app, install your app by downloading and opening the `.apk` file on your Android device.

If you don't have a physical Android device, you can use an Android emulator such as the free [Android Emulator included in Android Studio](https://developer.android.com/studio/run/emulator). Run the emulator and open the `.apk` file to install your app. You can also drag and drop the `.apk` file onto the Android emulator to install it.

## 3. Upload your `.apk` file to the Google Play Store

Your `.apk` file can be submitted directly to the Play Store through the [Google Play Console](https://developer.android.com/distribute/console).

Once you submit your app, it will be reviewed. Once approved, your PWA will be available in the Google Play Store. 😎

> 💁🏽‍♀️ *Heads up*: <br /><br />When you submit your app to Google Play, you may receive a warning about your APK being unoptimized:
<img src="https://user-images.githubusercontent.com/33334535/87479049-1071ac80-c62b-11ea-8f56-e25ce2cc3d1d.png" load="lazy" style="max-width: 300px" />
> This warning can be safely ignored. For more information, see [this thread](https://github.com/pwa-builder/CloudAPK/issues/23).

## Save your signing key

Your zip file contains `signing.keystore` and `signing-key-info.txt` -- keep these in a safe place. You'll need them to deploy future versions of your app.

`signing.keystore` is the Android key store file containing the signing key.

`signing-key-info.txt` is a text file containing your signing key information, such as the key password, store password, and key alias.

Keep both of these files in a safe place.

## Need more help?

If the browser address bar is showing up in your app, see our [asset links helper](/asset-links.md).

If you're otherwise stuck, we're here to help. You can [open an issue](https://github.com/pwa-builder/pwabuilder/issues) and we'll help walk you through it.