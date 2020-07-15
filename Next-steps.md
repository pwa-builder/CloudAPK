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

- Does you zip file contain `assetlinks.json`? If so, upload it to `https://example.com/.well-known/assetlinks.json`, and you're all set.
- If your zip file *doesn't* contain `assetlinks.json`, it means you generated an unsigned package. ([How do I change this?](https://medium.com/pwabuilder/microsoft-and-google-team-up-to-make-pwas-better-in-the-play-store-b59710e487#b5dc)). Follow the [these steps](https://developers.google.com/web/updates/2019/08/twas-quickstart#creating-your-asset-link-file) to generate your `assetlinks.json` file and upload it to your server at `https://example.com/.well-known/assetlinks.json`.

**Digital asset links are required for your PWA to load without the browser address bar**. If you're seeing a browser address bar in your app on Android, you likely forgot to generate your digital asset links file.

## 2. Test your APK on an Android device or Android emulator
Your zip file contains a `.apk` file - this is the Android app package that you can run on an Android device and you can submit to the Google Play Store.

To test your app, install your app by downloading and opening the `.apk` file on your Android device.

If you don't have a physical Android device, you can use an Android emulator such as the free [Android Emulator included in Android Studio](https://developer.android.com/studio/run/emulator). Run the emulator and open the `.apk` file to install your app.

## 3. Upload your `.apk` file to the Google Play Store

Your `.apk` file can be submitted directly to the Play Store through the [Google Play Console](https://developer.android.com/distribute/console).

Once you submit your app, it will be reviewed. Once approved, your PWA will be available in the Google Play Store. 😎

### Important note: Save your signing key

If your zip file contains `signing.keystore` and `signing-key-info.txt`, keep these in a safe place. You'll need them to deploy future versions of your app.

Whether your zip file contains these signing key files is dependent on how you generated your Android package on PWABuilder:

1. [Default] You created an unsigned APK package and [let Google Play manage signing](https://developer.android.com/studio/publish/app-signing#opt-out) - this is Google's recommendation, and PWABuilder's default.
2. You created your own signing key.

PWABuilder defaults to #1, and so your zip file will have neither a `.keystore` file nor a `assetlinks.json`. (You can control whether PWABuilder generates these in the [PWABuilder Android options page](https://medium.com/pwabuilder/microsoft-and-google-team-up-to-make-pwas-better-in-the-play-store-b59710e487#6325).)

However, if your zip file contains a `.keystore` file, it means you generated a signed APK package. Make sure you save both `signing.keystore` and `signing-key-info.txt` in a safe place. You'll need these signing files to upload new versions of your app in the Google Play Store.

## Need more help?

If you're stuck and need help, we're here to help. You can [open an issue](https://github.com/pwa-builder/pwabuilder/issues) and we'll help walk you through it.