export interface CustomerData {
    firstName: string;
    lastName: string;
    creditCardNumber: string;
    expirationMonth: number;
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