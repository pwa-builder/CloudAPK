const unzip = require('unzip2');
const fs = require('fs');
const fstream = require('fstream');
const path = require('path');
const os = require('os');

const getContents = (filePath) => {
    
    return new Promise((resolve,reject) =>{

        const fullPath = path.join(os.tmpdir(), filePath);
        const readStream = fs.createReadStream(path.join('app','uploads', filePath) + '.zip');
        const writeStream = fstream.Writer({path: fullPath, type: 'Directory'})

    readStream
        .pipe(unzip.Parse())
        .pipe(writeStream)
        .on('error', (err) => {
            return reject('Error unzipping the project: ' + err);
        })
        .on('end',()=>{
            return resolve(fullPath);
        });

    });
}