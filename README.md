# CloudApk
Building APK for Android on Docker for PWA


# Build docker image

> docker build . -t cloudapk-image

# Run Docker container

> docker run -p 3000:80 --name cloudapk cloudapk-image

# Generate APKs

Send a POST to / with a zipped android project (generated from PWABuilder or with the same folder structure) on the projectPackage key of the request's body form-data.
