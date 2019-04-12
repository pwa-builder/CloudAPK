const runCommand = require('./runCommand');

//This functions generates an unsigned apk for testing.
module.exports = (projectFolder) => {

    const command =  `cd ./${projectFolder}/projects/Polyfills/android/source && /opt/gradle/gradle-5.3.1/bin/gradle assemblerelease`;
    return await runCommand(command);
    
};

//TODO navigate to cd ./{projectfolder}/projects/Polyfills/android/source
//TODO /opt/gradle/gradle-5.3.1/bin/gradle assemblerelease