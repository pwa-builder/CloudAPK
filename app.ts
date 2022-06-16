import express from 'express';
const app = express();
const routes = require('./routes/project');
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(bodyParser.json());
app.use(
  cors({
    origin: '*',
  })
);
app.use('/', routes);
app.use(express.static('static'));

module.exports = app;
