import * as constants from '../constants';
import * as express from 'express';
import mockDatabase from '../db';
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
        return;
    }

    try {

        let attemptCount = 0;

        // The function to ping the payment gateway returns null if it encounters a 503 Service Unavailable.
        // We initialize the variable holding the response to null, then try three times to get it into a 
        // non-null state. After that, we bail and send a 503 to the client.

        let paymentGatewayResponse: PaymentGatewayResponse | null = null;

        do {

            attemptCount++;

            paymentGatewayResponse = await makePaymentGatewayRequest(body);

            // If this is still null, we got a 503 and need to try again

            if (paymentGatewayResponse !== null) {

                // Happy path

                if (paymentGatewayResponse.paid) {

                    mockDatabase.insert(body);

                    response.status(201);
                    response.json(APIResponse(constants.SUBSCRIPTION_SUCCESSFUL, null));
                    return;
                }

                // Possible errors

                if (paymentGatewayResponse.error === constants.INVALID_PAYMENT_CREDENTIALS) {
                    response.status(400);
                    response.json(APIResponse(null, constants.INVALID_PAYMENT_CREDENTIALS));
                    return;
                }

                if (paymentGatewayResponse.error === constants.INSUFFICIENT_FUNDS) {
                    response.status(400);
                    response.json(APIResponse(null, constants.INSUFFICIENT_FUNDS));
                    return;
                }

            }


        } while (attemptCount < 3);

        if (attemptCount >= 3) {

            //At this point we've tried three times with no luck, time to send a 503 to the client.

            response.status(503);
            response.json(APIResponse(null, constants.SERVICE_UNAVAILABLE));
            return;

        }

    } catch (error) {
        throw error;
    }

}
async function makePaymentGatewayRequest(customerData: CustomerData): Promise<PaymentGatewayResponse | null> {
    try {
        const paymentResponse = await requestPromise({
            method: 'POST',
            uri: `http://localhost:${process.env.APP_PORT}/api/v1/payment`,
            body: customerData,
            json: true,
            auth: {
                'user': process.env.PAYMENT_USER,
                'pass': process.env.PAYMENT_PASS
            }
        });

        return paymentResponse;
    } catch (error) {

        // If the "error" is just a 503 response from the gateway, we don't need to throw - 
        // we'll just return null and handle it.

        if (error.statusCode && error.statusCode === 503) {
            return null;
        }
        throw error;
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