import * as constants from '../constants';
import * as express from 'express';
import * as requestPromise from 'request-promise-native';

import { PaymentGatewayResponse } from '../payment';

export interface CustomerData {
    firstName: string;
    lastName: string;
    creditCardNumber: string;
    expirationMonth: string;
    expirationYear: number;
};

export interface APIResponse {
    data: null | {
        message: string;
    };
    error: null | {
        message: string;
    };
};

const subscriptionHandler = async (request: express.Request, response: express.Response): Promise<void> => {
    const { body } = request;
    if (!isValidCustomerData(body)) {
        response.status(400);
        response.json(APIResponse(null, constants.INVALID_CUSTOMER_DATA));
    }

    try {
        const paymentGatewayResponse: PaymentGatewayResponse = await requestPromise({
            method: 'POST',
            uri: `http://localhost:${process.env.APP_PORT}/api/v1/payment`,
            body,
            json: true,
            auth: {
                'user': process.env.PAYMENT_USER,
                'pass': process.env.PAYMENT_PASS
            }
        });

        if (paymentGatewayResponse.paid) {
            response.status(201);
            response.json(APIResponse(constants.SUBSCRIPTION_SUCCESSFUL, null));
        }
    } catch (e) {
        throw e;
    }

}

function APIResponse(dataMessage?: string | null, errorMessage?: string | null): APIResponse {
    return {
        data: dataMessage ? {
            message: dataMessage
        } : null,
        error: errorMessage ? {
            message: errorMessage
        } : null
    }
}

// TypeScript type guard to duck type an object and see if it matches the
// CustomerData interface.
// http://www.typescriptlang.org/docs/handbook/advanced-types.html

function isValidCustomerData(object: object): object is CustomerData {
    if (typeof (<CustomerData>object).firstName !== 'string') return false;

    if (typeof (<CustomerData>object).lastName !== 'string') return false;

    // Optional - more stringent credit card number validation
    if (typeof (<CustomerData>object).creditCardNumber !== 'string') return false;

    if (typeof (<CustomerData>object).expirationMonth !== 'string') return false;

    if (typeof (<CustomerData>object).expirationYear !== 'number') return false;

    return true;
}


export default subscriptionHandler;