import 'mocha';
import * as chai from 'chai';
import app from './index';

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

            })
        });
    });
});