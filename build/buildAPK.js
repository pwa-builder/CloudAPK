const runCommand = require('./runCommand');
const path = require('path');

module.exports = async (projectFolder) => {
    const buildPath = `${projectFolder}/projects/Polyfills/android/source`;
    const command = `cd ${buildPath} && /opt/gradle/gradle-5.3.1/bin/gradle assemblerelease`;
    
    await runCommand(command);

    return path.join(buildPath, '/app/build/outputs/apk/release/app-release-unsigned.apk');

};