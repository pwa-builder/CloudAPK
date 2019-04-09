# CloudApk
Building APK for Android on Docker for PWA


#Build docker image

docker build . -t androidsdk2

#Run Docker container

docker run -it --name android-test androidsdk2

#Run build task

Run the following commands: 

> cd ./app/projects/Polyfills/android/source
> /opt/gradle/gradle-5.3.1/bin/gradle assemblerelease

The APK will be created on: /app/app/projects/Polyfills/android/source/app/build/outputs/apk/release/app-release-unsigned.apk

