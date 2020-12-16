# Removing the Browser Address Bar

If you're seeing a browser address bar in your PWA Android app, it means you need to update your digital asset links.

This document shows how fix this issue so the browser address bar won't show up.

## Make sure assetlinks.json is valid and accessible

If you're not sure what asset links are or if you don't have an `assetlinks.json` file, go back and read our [Next Steps page](/Next-steps.md).

Once you have an `assetlinks.json` file deployed to your server, make sure it's accessible via a web browser at `https://YOUR-PWA-URL/.well-known/assetlinks.json`. (Replace YOUR-PWA-URL with the your PWA's URL.) It's important that this file be in the `/.well-known` subdirectory as shown above. Chrome on Android will look at this URL for your asset links file, and will show the browser addres bar if it's not found.

## Add production fingerprint

If you haven't already, you need to add Google Play's production fingerprint to your `assetlinks.json` file.

Login to the [Google Play Console](https://developer.android.com/distribute/console), select your app, then choose `Setup` -> `App signing`, then copy your `SHA-256 fingerprint`:

<img src="/static/google-play-signing.png" width="600px" />

Paste that fingerprint into your `assetlinks.json` file:

```json
[
    {
        "relation": ...,
        "target": {
            "namespace": ...,
            "package_name": ...,
            "sha256_cert_fingerprints": [
                "...",
                "PASTE YOUR NEW SHA-256 FINGERPRINT HERE"
            ]
        }
    }
]
```

Once you follow these steps, the browser address bar should no longer appear in your app. 😎

## Validate your `assetlinks.json` file

If your address bar is still showing up after the above steps, the issue is likely due to incorrect asset links: Android thinking your asset links are different than what your `assetlinks.json` file specifies.

To fix this, we'll check what Android believes is the asset links for your PWA, then update our `assetlinks.json` with the new value.

1. Install your app on an Android device or Android emulator
2. Install the [Asset Links Tool](https://play.google.com/store/apps/details?id=dev.conn.assetlinkstool) from the Google Play Store.
3. Run the Asset Links Tool and search for your PWA's package ID (e.g. `com.myawesomepwa`): <br /> <img src="/static/asset-links-package-id.png" width="300px" />
4. Tap your PWA's package ID to view its asset links, then tap `Copy Signature` <br /> <img src="/static/asset-links-details.png" width="300px" />
5. Open your `assetlinks.json` file and find the `sha256_cert_fingerprints` array member. Paste the copied signature into the `sha256_cert_fingerprints`. Your `assetlinks.json` file should look something like this, with 2 fingerprints separated by a comma as shown below:
```json
[{
      "relation": ...,
      "target" : { 
            "namespace": ..., 
            "package_name": ...,
            "sha256_cert_fingerprints": [
                  "...",
                  "4B:C1:D7:C7:8D:74:21:56:8C:E0:13:00:12:35:19:94:4B:33:1E:3C:2B:E5:7A:04:04:FE:F9:3E:58:30:B0:F4"
            ] 
      }
}]
```

6. Save your `assetlinks.json` file and re-upload to your server. 

> 💁‍♀️ *Heads up*
> 
> Make sure your pasted fingerprints have a comma between them, otherwise your `assetlinks.json` will contain invalid JSON. You can [validate your JSON](https://jsonformatter.curiousconcept.com/) to be sure everything's correct.

Once you follow these steps, the browser address bar should no longer appear in your app. 😎

## The browser address bar is _still_ showing

If you followed all these steps and are still seeing the browser address bar, we're here to help. [Open an issue](https://github.com/pwa-builder/PWABuilder/issues/new?assignees=&labels=android-platform&body=Type%20your%20question%20here.%20Please%20include%20the%20URL%20to%20your%20app%20in%20Google%20Play.%0A%0A%3E%20If%20my%20answer%20was%20in%20the%20docs%20all%20along%2C%20I%20promise%20to%20give%20%245%20USD%20to%20charity.&title=Address%20bar%20still%20showing%20in%20my%20app) and we'll help you fix it.