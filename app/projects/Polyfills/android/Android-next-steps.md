# Test - Build - Submit

## Test

1. Your application uses the same rendering and JavaScript Engine as the Chrome Browser so most of you testing can be done on your website and in the browser.

2. To test your application on a device, download the PWA Builder test harness from the Store, and follow the directions. _Coming soon!_

> **Note:** Looking for some debugging tools that work on all your platforms? Try [Vorlon.js](http://www.vorlonjs.com/). It makes mobile testing a breeze, and works inside the app PWA Builder apps.

## Build

1. Download and install the [Java SDK](http://www.oracle.com/technetwork/java/javase/downloads/index.html).

2. [Download](http://developer.android.com/sdk/installing/index.html?pkg=studio) and install Android Studio and the Android SDK.

3. Open the Gradle file from Android Studio (import project)

4. (Optional) Customize the splash screen of the app. Edit `app\res\drawable\splash.xml` and specify the image of your preference. If found, PWA Builder will place a suggested splash screen in `app\res\mipmap\ic_splash.png`.

4. Use Build Menu to create package.


## Submit to Store

1. Set up a Android Developer account [here](https://play.google.com/apps/publish/signup/).

2. Reserve the name of your app.

3. Upload your apk package.