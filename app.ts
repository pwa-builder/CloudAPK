import express from 'express';
const app = express();
const routes = require('./routes/project');
const bodyParser = require('body-parser');

const cors = require('cors');

app.use(bodyParser.json());
app.use(cors());
app.use('/', routes);

module.exports = app;