# Removing the Browser Address Bar

If you're seeing a browser address bar in your PWA Android app, it means your digital asset links are missing, inaccessible, or incorrect.

This document shows how to debug and fix this issue.

## Make sure assetlinks.json is valid and accessible

If you're not sure what asset links are or if you don't have an `assetlinks.json` file, go back and read our [Next Steps ➡ Digital Asset Links explainer](/Next-steps.md#1-deploy-assetlinksjson).

Once you have an `assetlinks.json` file deployed to your server, make sure it's accessible via a web browser at `https://YOUR-PWA-URL/.well-known/assetlinks.json`. (Replace YOUR-PWA-URL with the your PWA's URL.) It's important that this file be in the `/.well-known` subdirectory as shown above. Chrome on Android will look at this URL for your asset links file, and will show the browser addres bar if it's not found.

## Validate your `assetlinks.json` file

If your `assetlinks.json` file is accessible at the correct URL, the issue is likely due to incorrect asset links: Android thinking your asset links are different than what your `assetlinks.json` file specifies. This can happen, for example, if Google Play signs your app package with an additional signing key, thus changing your asset links.

To fix this, we'll check what Android believes is the asset links for your PWA, then update our `assetlinks.json` with the new value.

1. Install your app on an Android device or Android emulator
2. Install the [Asset Links Tool](https://play.google.com/store/apps/details?id=dev.conn.assetlinkstool) from the Google Play Store.
3. Run the Asset Links Tool and search for your PWA's package ID (e.g. `com.myawesomepwa`): <br /> <img src="/static/asset-links-package-id.png" width="300px" />
4. Tap your PWA's package ID to view its asset links, then click `Copy Signature` <br /> <img src="/static/asset-links-details.png" width="300px" />
5. Open your `assetlinks.json` file and find the `sha256_cert_fingerprints` array member. Paste the copied signature into the `sha256_cert_fingerprints`. Your `assetlinks.json` file should look something like this, with 2 fingerprints separated by a comma as shown below:
```json
[{
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target" : { 
            "namespace": "android_app", 
            "package_name": "com.myawesomepwa",
            "sha256_cert_fingerprints": [
                  "E8:DC:C2:A7:FD:E4:8F:C2:B1:E8:DC:DF:29:6A:00:86:57:A0:F7:EF:49:62:C1:45:32:34:6F:06:CF:32:45:BD",
                  "4B:C1:D7:C7:8D:74:21:56:8C:E0:13:00:12:35:19:94:4B:33:1E:3C:2B:E5:7A:04:04:FE:F9:3E:58:30:B0:F4"
            ] 
      }
}]
```

6. Save your `assetlinks.json` file and re-upload to your server. 

> 💁‍♀️ *Heads up*
> 
> Make sure the 2 fingerprints have a comma between them, otherwise your `assetlinks.json` will contain invalid JSON. You can [validate your JSON](https://jsonformatter.curiousconcept.com/) to be sure everything's correct.

Once you follow these steps, the browser address bar should no longer appear in your app. 😎

## The browser address bar is _still_ showing

If you followed these steps and are still seeing the browser address bar, we're here to help. [Open an issue](https://github.com/pwa-builder/PWABuilder/issues) and we'll help you fix it.