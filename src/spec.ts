import 'mocha';
import app from './index';
import * as chai from 'chai';
import * as constants from './constants';
import * as sinon from 'sinon';
import * as util from './util';

import { CustomerData } from './api';
import { PaymentGatewayResponse } from './payment';


chai.use(require('chai-http'));

const { assert } = chai;

const rootEndpoint = '/api/v1';

describe('Server', () => {
    describe("Payment Gateway - /payment", () => {

        const paymentEndpoint = rootEndpoint + '/payment';

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

                const customerData: CustomerData = {
                    firstName: 'Jane',
                    lastName: 'Smith',
                    creditCardNumber: '1111222233334444',
                    expirationMonth: '05',
                    expirationYear: 2019
                };

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
});