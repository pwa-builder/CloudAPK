# Next steps for getting your PWA into the Google Play Store
You've successfully generated a Google Play Store app package for your PWA. 😎

Your next steps:
1. **Deploy `assetlinks.json` to your server** to prove domain ownership.
2. **Test your app**: open the `.apk` file on an Android device or Android emulator.
3. **Submit your app to Google Play**: upload the `.aab` file to the Google Play Store.

Each step is explained below.

## 1. Deploy `assetlinks.json`

Your zip file contains `assetlinks.json`. This is a [digital asset links file](https://developers.google.com/web/updates/2019/08/twas-quickstart#creating-your-asset-link-file) that proves you own your PWA's domain. Upload this file to your server at `https://example.com/.well-known/assetlinks.json`. (Replace example.com with your PWA's URL.)

> 💁‍♂️ *Heads up*: 
> 
> **Digital asset links are required for your PWA to load without the browser address bar**. If you're seeing a browser address bar in your app on Android, your `assetlinks.json` file is missing, inaccessible, or incorrect. See our [asset links helper](/Asset-links.md) to fix this.

## 2. Test your app on an Android device or Android emulator
Your zip file contains an `.apk` (Android Package) file, which can be loaded on your personal Android device or Android emulator.

**To test your app, install open the `.apk` file on your Android device or emulator.**

If you don't have a physical Android device, you can use an Android emulator such as the free [Android Emulator included in Android Studio](https://developer.android.com/studio/run/emulator). Run the emulator and open the `.apk` file to install your app. You can also drag and drop the `.apk` file onto the Android emulator to install it.

## 3. Upload your app to the Google Play Store

Your zip file contains an `.aab` (Android App Bundle) file which can be submitted directly to the Play Store through the [Google Play Console](https://developer.android.com/distribute/console).

Once you submit your app, it will be reviewed. Once approved, your PWA will be available in the Google Play Store. 😎

> 💁🏽‍♀️ *Heads up*: 
> 
> When you upload your app to Google Play for the first time, you'll be prompted to let Google manage your signing key. **You should opt-out**: <br /> <img src="/static/opt-out-google-play.png" width="300px" /> <br />
> If you don't opt-out, you'll need to update your assetlinks.json file. See our [asset links helper](/Asset-links.md) for more info.

> 🙋🏼‍♂️ *Heads up*: 
> 
> When you upload your app to to Google Play for the first time, you'll be prompted to let Google manage your signing key. **You should opt-out**: <br /> <img src="/static/opt-out-google-play.png" width="300px" /> <br />
> If you don't opt-out, you'll need to update your assetlinks.json file. See our [asset links helper](/Asset-links.md) for more info.

## Save your signing key

Your zip file contains `signing.keystore` and `signing-key-info.txt` -- keep these in a safe place. You'll need them to deploy future versions of your app.

- `signing.keystore` is the Android key store file containing the signing key.
- `signing-key-info.txt` is a text file containing your signing key information, such as the key password, store password, and key alias.

Keep both of these files in a safe place.

## Need more help?

If the browser address bar is showing up in your app, see our [asset links helper](/Asset-links.md).

If you're otherwise stuck, we're here to help. You can [open an issue](https://github.com/pwa-builder/pwabuilder/issues) and we'll help walk you through it.