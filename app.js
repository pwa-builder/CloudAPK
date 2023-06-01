import express from 'express';
import router from './routes/project.js';
import cors from 'cors';
import bodyParser from 'body-parser';
const app = express();
app.use(bodyParser.json());
app.use(cors({
    origin: '*',
}));
app.use('/', router);
app.use(express.static('static'));
export default app;
//# sourceMappingURL=app.js.map