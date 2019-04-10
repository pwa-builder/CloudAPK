 const express = require('express'); 
 const router = express.Router();
 
 router.get('/', (req, res, next) => {
     res.status(200).json({
        message: 'OK'
     });
 });

 router.post('/', (req, res, next) =>{
     res.status(200).json({
         message: 'Post handling'
     });
 } );

 module.exports = router;   