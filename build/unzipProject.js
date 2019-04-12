const unzip = require('unzip2');
const fs = require('fs');
const fstream = require('fstream');
const path = require('path');

module.exports = (filePath) => {
    
    const readStream = fs.createReadStream(filePath);
    const writeStream = fstream.Writer(outputPath);

    readStream
        .pipe(unzip.Parse())
        .pipe(writeStream)
        .on('error', (err) => {
            console.log('Error Creating ReadStream: ' + err);
        });
}