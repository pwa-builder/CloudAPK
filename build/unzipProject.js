const unzip = require('unzip2');
const fs = require('fs');
const path = require('path');
const constants = require('../constants');

module.exports = (filePath) => {
    return new Promise((resolve,reject) =>{
        const tmpDir = constants.UNZIP_PATH;
        const readStream = fs.createReadStream(path.join(constants.UPLOAD_DIRECTORY, filePath + ".zip"));
        
        readStream.pipe(unzip.Extract({ path: tmpDir}))
                .on('error', (err) => {
                    return reject('Error unzipping the project: ' + err);
                })
                .on('finish',()=>{
                    return resolve(path.join(tmpDir, filePath));
                });

    });
}