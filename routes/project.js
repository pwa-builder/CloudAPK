 const express = require('express');
 const router = express.Router();
 const multer = require('multer');
 const build = require('./build/build.js');


 const storage = multer.diskStorage({
   destination: function (req, file, cb) {
     cb(null, './uploads/');
   },
   //  limits: {
   //     fileSize: 1024 * 1024 * 5
   //   },
   filename: function (req, file, cb) {
     cb(null, file.originalname);
   }
 });

 const fileFilter = (req, file, cb) => {
   // reject a file
   if (file.mimetype === 'application/zip') {
     cb(null, true);
   } else {
     cb(null, false);
   }
 };

 const upload = multer({
   storage: storage,
   fileFilter: fileFilter
 });


 router.post('/', upload.single('projectPackage'), (req, res, next) => {
   build.getProj(file.filepath).then((outputPath) => { //call getProj with filepath
       res.set('Content-type', 'application/octet-stream');
       var reader = fs.createReadStream(outputPath);
       reader.on('end', function () {
         console.log('Package download completed.');
         res.status(201).end();
       });
       reader.on('error', function (err) {
         console.log('Error streaming package contents: ' + err);
         res.status(500).send('APK package download failed.').end();
       });
       reader.pipe(res);
     })
     .catch(function (err) {
       console.log('Package generation failure: ' + err);
       res.status(500).send('APK package generation failed. ' + err).end();
     })
     .done();
 });

 //check _dirname for the apk for the response.

 module.exports = router;