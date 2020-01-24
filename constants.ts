import { tmpdir } from "os";

export = {
    UPLOAD_DIRECTORY: "/uploads",
    UNZIP_PATH: tmpdir(),
    JDK_PATH: "C:/Program Files/AdoptOpenJDK/jdk-8.0.232.09-hotspot", // Llama-Pack requires JDK 8: https://adoptopenjdk.net/releases.html?variant=openjdk8&jvmVariant=hotspot
    ANDROID_TOOLS_PATH: "C:/AndroidTools" // llama-pack requires Android command line tools: https://developer.android.com/studio#command-tools
};