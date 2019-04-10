const express = require('express');
const app = express();

const routes = requires('/routes/projects');

app.use('/projects', routes);

module.exports = app;