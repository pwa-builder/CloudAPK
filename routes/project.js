 const express = require('express');
 const router = express.Router();
 const multer = require('multer');


 const storage = multer.diskStorage({
     destination: function (req, file, cb) {
         cb(null, './uploads/');
     },
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
     storage: storage, fileFilter: fileFilter
 });


 router.post('/', upload.single('projectPackage'), (req, res, next) => {
     console.log(req.file);
 });

 module.exports = router;