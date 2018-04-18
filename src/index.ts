import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import * as express from 'express';

import paymentHandler from './payment';
import { subscriptionHandler, subscriptionListHandler } from './api';

dotenv.config();

const app = express();

app.use(bodyParser.json());

const apiRouter = express.Router();

app.use('/api/v1', apiRouter);

apiRouter.post('/payment', paymentHandler);
apiRouter.post('/subscribe', subscriptionHandler);
apiRouter.get('/subscribe', subscriptionListHandler);

app.listen(parseInt(process.env.APP_PORT as string));

console.log(`Application listening on port ${process.env.APP_PORT}`);

export default app;