import * as dotenv from 'dotenv';
import * as express from 'express';

import paymentHandler from './payment';

dotenv.config();

const app = express();

const apiRouter = express.Router();

app.use('/api/v1', apiRouter);

apiRouter.post('/payment', paymentHandler);

export default app;