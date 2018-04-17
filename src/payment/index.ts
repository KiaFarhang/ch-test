import * as constants from '../constants';

export interface PaymentGatewayResponse {
    id: number;
    paid: boolean;
    error: null | constants.INSUFFICIENT_FUNDS;
};