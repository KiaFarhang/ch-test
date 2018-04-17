import * as express from 'express';

const app = express();

const apiRouter = express.Router();

app.use('/api/v1', apiRouter);

export default app;