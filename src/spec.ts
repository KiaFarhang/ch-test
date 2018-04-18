import 'mocha';
import app from './index';
import * as chai from 'chai';
import * as constants from './constants';
import mockDatabase from './db';
import * as nock from 'nock';
import * as sinon from 'sinon';
import * as util from './util';

import { APIResponse, CustomerData } from './api';
import { PaymentGatewayResponse } from './payment';
import { CustomerTableRow } from './db';


chai.use(require('chai-http'));

const { assert } = chai;

const rootEndpoint = '/api/v1';

const paymentEndpoint = rootEndpoint + '/payment';

describe('Server', () => {

    // 'Valid' customer data used across both test suites

    const customerData: CustomerData = {
        firstName: 'Jane',
        lastName: 'Smith',
        creditCardNumber: '1111222233334444',
        expirationMonth: '05',
        expirationYear: 2019
    };
    describe("Payment Gateway - /payment", () => {

        describe("POST", () => {
            describe("No Authorization header", () => {
                let response: ChaiHttp.Response;
                before(async () => {

                    response = await chai.request(app)
                        .post(paymentEndpoint)
                        .send({ name: 'Foo Bar' });

                });
                it("Returns a 401 Unauthorized", () => {
                    assert.strictEqual(response.status, 401);
                });
            });
            describe("Invalid Authorization header", () => {
                let response: ChaiHttp.Response;
                before(async () => {
                    response = await chai.request(app)
                        .post(paymentEndpoint)
                        .auth('Foo', 'Bar')
                        .send({ name: 'Foo Bar' });
                });
                it("Returns a 401 Unauthorized", () => {
                    assert.strictEqual(response.status, 401);
                });
            });
            describe("Valid authorization header", () => {

                const randomNumberStub = sinon.stub(util, 'getRandomInt');
                randomNumberStub.onCall(0).returns(0);
                randomNumberStub.onCall(1).returns(1);
                randomNumberStub.onCall(2).returns(2);

                after(() => {
                    randomNumberStub.restore();
                });

                describe("Sufficient funds", () => {
                    let response: ChaiHttp.Response;
                    let body: PaymentGatewayResponse;

                    before(async () => {
                        response = await chai.request(app)
                            .post(paymentEndpoint)
                            .auth(process.env.PAYMENT_USER as string, process.env.PAYMENT_PASS as string)
                            .send(customerData);

                        body = response.body;
                    });

                    it("Returns a 200 OK status code", () => {
                        assert.strictEqual(response.status, 200);
                    });
                    it("Returns an object body", () => {
                        assert.isObject(body);
                    });
                    describe("Response body", () => {
                        it('Has a string "id" property', () => {
                            assert.property(body, 'id');
                            assert.isString(body.id);
                        });
                        it('Has a boolean "paid" property set to true', () => {
                            assert.property(body, 'paid');
                            assert.isTrue(body.paid);
                        });
                        it('Has a null "error" property', () => {
                            assert.property(body, 'error');
                            assert.isNull(body.error);
                        });
                    });
                });

                describe("Insufficient funds", () => {
                    let response: ChaiHttp.Response;
                    let body: PaymentGatewayResponse;

                    before(async () => {
                        response = await chai.request(app)
                            .post(paymentEndpoint)
                            .auth(process.env.PAYMENT_USER as string, process.env.PAYMENT_PASS as string)
                            .send(customerData);

                        body = response.body;
                    });

                    it("Returns a 200 OK status code", () => {
                        assert.strictEqual(response.status, 200);
                    });

                    it("Returns an object body", () => {
                        assert.isObject(body);
                    });

                    describe("Response body", () => {
                        it('Has a string "id" property', () => {
                            assert.property(body, 'id');
                            assert.isString(body.id);
                        });
                        it('Has a boolean "paid" property set to false', () => {
                            assert.property(body, 'paid');
                            assert.isFalse(body.paid);
                        });
                        it('Has a string "error" property set to "INSUFFICIENT_FUNDS"', () => {
                            assert.property(body, 'error');
                            assert.isString(body.error);
                            assert.strictEqual(body.error, constants.INSUFFICIENT_FUNDS);
                        });
                    });
                });

                describe("Timeout/error", () => {
                    let response: ChaiHttp.Response;
                    let body: PaymentGatewayResponse;

                    before(async () => {
                        response = await chai.request(app)
                            .post(paymentEndpoint)
                            .auth(process.env.PAYMENT_USER as string, process.env.PAYMENT_PASS as string)
                            .send(customerData);

                        body = response.body;
                    });

                    it("Returns a 503 Service Unavailable status code", () => {
                        assert.strictEqual(response.status, 503);
                    });

                    it("Returns an object body", () => {
                        assert.isObject(body);
                    });

                    describe("Response body", () => {
                        it('Has a string "id" property', () => {
                            assert.property(body, 'id');
                            assert.isString(body.id);
                        });
                        it('Has a boolean "paid" property set to false', () => {
                            assert.property(body, 'paid');
                            assert.isFalse(body.paid);
                        });
                        it('Has a string "error" property set to "SERVICE_UNAVAILABLE"', () => {
                            assert.property(body, 'error');
                            assert.isString(body.error);
                            assert.strictEqual(body.error, constants.SERVICE_UNAVAILABLE);
                        });
                    });
                });
            });
        });
    });

    describe('Subscription endpoint - /subscribe', () => {
        const subscriptionEndpoint = rootEndpoint + '/subscribe';

        after(() => {
            nock.cleanAll();
        });

        describe('POST', () => {
            describe('Invalid customer data', () => {

                const invalidData = {
                    foo: 'Bar'
                };

                const mockPaymentResponse = {
                    data: null,
                    error: {
                        message: 'Valid authorization is required'
                    }
                };

                let response: ChaiHttp.Response;
                let body: APIResponse;

                before(async () => {
                    response = await chai.request(app)
                        .post(subscriptionEndpoint)
                        .send(invalidData);

                    body = response.body;
                });

                it('Returns a 400 Bad Request', () => {
                    assert.strictEqual(response.status, 400);
                });
                it('Returns an object body', () => {
                    assert.isObject(body);
                });

                describe('Response body', () => {
                    it('Has a null "data" property', () => {
                        assert.isNull(body.data);
                    });
                    it('Has an object "error" property, which has a "message" property set to the invalid customer data constant', () => {
                        assert.isObject(body.error);
                        assert.property(body.error, 'message');
                        if (body.error) {
                            assert.strictEqual(body.error.message, constants.INVALID_CUSTOMER_DATA);
                        }
                    });
                });
            });

            describe('Valid customer data', () => {
                describe('Sufficient funds', () => {

                    const mockPaymentResponse: PaymentGatewayResponse = {
                        id: util.getRandomHexString(),
                        paid: true,
                        error: null
                    };

                    const mockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                        .post('/api/v1/payment', customerData)
                        .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                        .reply(201, mockPaymentResponse);

                    describe('Successfully adds customer to database', () => {
                        let response: ChaiHttp.Response;
                        let body: APIResponse;

                        before(async () => {
                            response = await chai.request(app)
                                .post(subscriptionEndpoint)
                                .send(customerData);

                            body = response.body;
                        });

                        after(() => {
                            mockDatabase.clear();
                        });

                        it('Adds the customer to the database', () => {
                            const databaseRows: CustomerTableRow[] = mockDatabase.selectAll();
                            assert.lengthOf(databaseRows, 1);

                            const customerFromDB = databaseRows[0];

                            // We don't just check for deep object equality because the database entry
                            // also has a Date subscriptionDate property that the customer data lacks.

                            assert.strictEqual(customerFromDB.firstName, customerData.firstName);
                            assert.strictEqual(customerFromDB.lastName, customerData.lastName);
                            assert.strictEqual(customerFromDB.creditCardNumber, customerData.creditCardNumber);
                            assert.strictEqual(customerFromDB.expirationMonth, customerData.expirationMonth);
                            assert.strictEqual(customerFromDB.expirationYear, customerData.expirationYear);

                        });
                        it('Returns a 201 Created status code', () => {
                            assert.strictEqual(response.status, 201);
                        });
                        it('Returns an object body', () => {
                            assert.isObject(body);
                        });
                        describe('Response body', () => {
                            it('Has an object "data" property, which has a string "message" property set to the success constant', () => {
                                assert.isObject(body.data);
                                assert.property(body.data, 'message');
                                if (body.data) {
                                    assert.strictEqual(body.data.message, constants.SUBSCRIPTION_SUCCESSFUL);
                                }
                            });
                            it('has a null "error" property', () => {
                                assert.isNull(body.error);
                            });
                        });
                    });
                    describe('Fails to add customer to database', () => {

                    });
                });
                describe('Insufficient funds', () => {
                    const mockPaymentResponse: PaymentGatewayResponse = {
                        id: util.getRandomHexString(),
                        paid: false,
                        error: constants.INSUFFICIENT_FUNDS
                    };

                    const mockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                        .post('/api/v1/payment', customerData)
                        .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                        .reply(200, mockPaymentResponse);

                    let response: ChaiHttp.Response;
                    let body: APIResponse;

                    before(async () => {
                        response = await chai.request(app)
                            .post(subscriptionEndpoint)
                            .send(customerData);

                        body = response.body;
                    });

                    it('Returns a 400 Bad Request status code', () => {
                        assert.strictEqual(response.status, 400);
                    });
                    it('Returns an object body', () => {
                        assert.isObject(body);
                    });
                    describe('Response body', () => {
                        it('has a null "data" property', () => {
                            assert.isNull(body.data);
                        });
                        it('has an object "error" property, which has a string "message" set to the insufficient funds constant', () => {
                            assert.isObject(body.error);
                            assert.property(body.error, 'message');
                            if (body.error) {
                                assert.strictEqual(body.error.message, constants.INSUFFICIENT_FUNDS);
                            }
                        });
                    });
                });
                describe('Payment gateway error', () => {
                    describe('Successful retry (within two additional attempts)', () => {
                        describe('Sufficient funds', () => {
                            const firstMockPaymentResponse: PaymentGatewayResponse = {
                                id: util.getRandomHexString(),
                                paid: false,
                                error: constants.SERVICE_UNAVAILABLE
                            };

                            const secondMockPaymentResponse: PaymentGatewayResponse = {
                                id: util.getRandomHexString(),
                                paid: true,
                                error: null
                            };

                            const firstMockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                                .post('/api/v1/payment', customerData)
                                .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                                .reply(503, firstMockPaymentResponse);


                            const secondMockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                                .post('/api/v1/payment', customerData)
                                .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                                .reply(200, secondMockPaymentResponse);

                            let response: ChaiHttp.Response;
                            let body: APIResponse;

                            before(async () => {
                                response = await chai.request(app)
                                    .post(subscriptionEndpoint)
                                    .send(customerData);

                                body = response.body;
                            });

                            after(() => {
                                mockDatabase.clear();
                            });

                            it('Returns a 201 Created status code', () => {
                                assert.strictEqual(response.status, 201);
                            });

                            it('Adds the customer to the database', () => {
                                const databaseRows: CustomerTableRow[] = mockDatabase.selectAll();
                                assert.lengthOf(databaseRows, 1);

                                const customerFromDB = databaseRows[0];

                                assert.strictEqual(customerFromDB.firstName, customerData.firstName);
                                assert.strictEqual(customerFromDB.lastName, customerData.lastName);
                                assert.strictEqual(customerFromDB.creditCardNumber, customerData.creditCardNumber);
                                assert.strictEqual(customerFromDB.expirationMonth, customerData.expirationMonth);
                                assert.strictEqual(customerFromDB.expirationYear, customerData.expirationYear);

                            });
                            it('Returns an object body', () => {
                                assert.isObject(body);
                            });
                            describe('Response body', () => {
                                it('Has an object "data" property, which has a string "message" property set to the success constant', () => {
                                    assert.isObject(body.data);
                                    assert.property(body.data, 'message');
                                    if (body.data) {
                                        assert.strictEqual(body.data.message, constants.SUBSCRIPTION_SUCCESSFUL);
                                    }
                                });
                                it('has a null "error" property', () => {
                                    assert.isNull(body.error);
                                });
                            });
                        });
                        describe('Insufficient funds', () => {
                            const firstAndSecondMockPaymentResponse: PaymentGatewayResponse = {
                                id: util.getRandomHexString(),
                                paid: false,
                                error: constants.SERVICE_UNAVAILABLE
                            };

                            const thirdMockPaymentResponse: PaymentGatewayResponse = {
                                id: util.getRandomHexString(),
                                paid: false,
                                error: constants.INSUFFICIENT_FUNDS
                            };

                            const firstMockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                                .post('/api/v1/payment', customerData)
                                .times(2)
                                .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                                .reply(200, firstAndSecondMockPaymentResponse);

                            const secondMockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                                .post('/api/v1/payment', customerData)
                                .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                                .reply(200, thirdMockPaymentResponse);

                            let response: ChaiHttp.Response;
                            let body: APIResponse;

                            before(async () => {
                                response = await chai.request(app)
                                    .post(subscriptionEndpoint)
                                    .send(customerData);

                                body = response.body;
                            });

                            it('Returns a 400 Bad Request status code', () => {
                                assert.strictEqual(response.status, 400);
                            });
                            it('Returns an object body', () => {
                                assert.isObject(body);
                            });
                            describe('Response body', () => {
                                it('has a null "data" property', () => {
                                    assert.isNull(body.data);
                                });
                                it('has an object "error" property, which has a string "message" set to the insufficient funds constant', () => {
                                    assert.isObject(body.error);
                                    assert.property(body.error, 'message');
                                    if (body.error) {
                                        assert.strictEqual(body.error.message, constants.INSUFFICIENT_FUNDS);
                                    }
                                });
                            });
                        });
                    });
                    describe('Unsuccessful retry (three failed attempts)', () => {
                        const mockPaymentResponse: PaymentGatewayResponse = {
                            id: util.getRandomHexString(),
                            paid: false,
                            error: constants.SERVICE_UNAVAILABLE
                        };

                        const mockPaymentGateway = nock(`http://localhost:${process.env.APP_PORT}`)
                            .post('/api/v1/payment', customerData)
                            .times(4)
                            .basicAuth({ user: process.env.PAYMENT_USER as string, pass: process.env.PAYMENT_PASS as string })
                            .reply(503, mockPaymentResponse);

                        let response: ChaiHttp.Response;
                        let body: APIResponse;

                        before(async () => {
                            response = await chai.request(app)
                                .post(subscriptionEndpoint)
                                .send(customerData);

                            body = response.body;
                        });

                        it("Returns a 503 Service Unavailable status code", () => {
                            assert.strictEqual(response.status, 503);
                        });

                        it("Returns an object body", () => {
                            assert.isObject(body);
                        });

                        describe("Response body", () => {
                            it('has a null "data" property', () => {
                                assert.isNull(body.data);
                            });
                            it('has an object "error" property, which has a string "message" set to the service unavailable constant', () => {
                                assert.isObject(body.error);
                                assert.property(body.error, 'message');
                                if (body.error) {
                                    assert.strictEqual(body.error.message, constants.SERVICE_UNAVAILABLE);
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});