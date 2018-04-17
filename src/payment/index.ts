import * as constants from '../constants';
import * as express from 'express';
import * as util from '../util';

export interface PaymentGatewayResponse {
    id: string;
    paid: boolean;
    error: null | constants.INSUFFICIENT_FUNDS | constants.SERVICE_UNAVAILABLE;
};

const paymentHandler = async (request: express.Request, response: express.Response): Promise<void> => {
    const isAuthorizationValid = (): boolean => {
        if (!request.headers.authorization) {
            return false;
        }

        const validUser = process.env.PAYMENT_USER;
        const validPass = process.env.PAYMENT_PASS;

        // Stolen shamefully from an excellent SO answer:
        // https://stackoverflow.com/questions/23616371/basic-http-authentication-with-node-and-express-4

        const b64auth = (request.headers.authorization || '').split(' ')[1] || ''
        const [user, password] = new Buffer(b64auth, 'base64').toString().split(':')

        if (user !== validUser || password !== validPass) {
            return false;
        }

        return true;
    }

    if (!isAuthorizationValid()) {
        response.status(401);
        response.json({
            data: null,
            error: {
                message: 'Valid authorization is required'
            }
        })
    } else {
        const randomIntegerZeroToTwo = util.getRandomInt(3);

        if (randomIntegerZeroToTwo === 0) {
            response.status(200);

            response.json(PaymentGatewayResponse(true));
        } else if (randomIntegerZeroToTwo === 1) {
            response.status(200);

            response.json(PaymentGatewayResponse(false, constants.INSUFFICIENT_FUNDS));
        } else {
            response.status(503);

            response.json(PaymentGatewayResponse(false, constants.SERVICE_UNAVAILABLE));
        }
    }
};

function PaymentGatewayResponse(paid: boolean, error?: constants.INSUFFICIENT_FUNDS | constants.SERVICE_UNAVAILABLE): PaymentGatewayResponse {
    return {
        id: util.getRandomHexString(),
        paid,
        error: error ? error : null
    }
}

export default paymentHandler;