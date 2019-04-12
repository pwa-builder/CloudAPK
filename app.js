const express = require('express');
const app = express();
const fs = require('fs');
const multer = require('multer');
const util = require('util');
const Q = require('q');
const rmdir = Q.nfbind(require('rimraf'));
const url = require('url');
const path = require('path');
const routes = require('./routes/project');

app.use('/', routes);

module.exports = app;