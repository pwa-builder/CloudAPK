const unzip = require('unzip2');
const fs = require('fs');
const fstream = require('fstream');
const path = require('path');

const getContents = (filePath) => {
    
    const readStream = fs.createReadStream(filePath);
    const writeStream = fstream.Writer({path: path.join(__dirname + '/app'), type: 'Directory'});

    readStream
        .pipe(unzip.Parse())
        .pipe(writeStream)
        .on('error', (err) => {
            console.log('Error Creating ReadStream: ' + err);
        });
}

getContents('./uploads/app.zip');
getContents('./uploads/monolito.zip');