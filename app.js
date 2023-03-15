"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const routes = require('./routes/project');
const bodyParser = require('body-parser');
const cors = require('cors');
app.use(bodyParser.json());
app.use(cors({
    origin: '*',
}));
app.use('/', routes);
app.use(express_1.default.static('static'));
module.exports = app;
//# sourceMappingURL=app.js.map