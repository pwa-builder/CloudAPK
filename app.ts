import express from 'express';
const app = express();
const routes = require('./routes/project');
const bodyParser = require('body-parser');

app.use(bodyParser.json());
app.use('/', routes);

module.exports = app;