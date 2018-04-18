# Mock Subscription API #

This Node.js / Express application serves as a mock subscription API. Clients send customer information (name, credit card number, etc.) to the API, which pushes that information to a mock payment gateway.

What happens next is random, depending on how the payment gateway decides to respond:

- If the customer has sufficient funds, the API sends them a 200 status code and a message thanking them for subscribing.
- If the customer lacks sufficient funds, the API sends them a 400 status code and lets them know their funds are insufficient.
- Finally, if the gateway is unreachable after three tries, the API returns a 503 Unavailable status code to the client.

This project is written in TypeScript, with tests in the Mocha JavaScript framework. To run it, clone this repository, enter it and install dependencies using `npm install` or `yarn`.

Before anything works, you'll need to create a git-ignored `.env` file at the root of the project containing project configuration. Since this is just a demo, feel free to copy the below into the file you create:

```
PAYMENT_USER=billing
PAYMENT_PASS=gateway
APP_PORT=8005
```

Now you can run the application with `npm run start` or `yarn start`. You'll see a message on your console telling you which port the app is listening on. Feel free to try it out by pinging the following URL in Postman:

`http://localhost:8005/api/v1/subscribe`

Send Basic Authorization with username `billing` and password `gateway`, and try the following dummy data in your raw response body:

```json
{
	"firstName": "Kia",
	"lastName": "Farhang",
	"creditCardNumber": "1122334455667788",
	"expirationMonth": "02",
	"expirationYear": 2020
}
```

You should see the application respond with a success or insufficient funds message! (A timeout is rare, because the 1/3 timeout chance must occur three times in a row).

Feel free to tinker with the response body - there's no extensive validation built in just yet, so as long as the above properties are present the request should go through.

Once you've POSTed a few times, try a basic GET request at that same endpoint. You'll see a list of all the customers in the "database" and a date string 30 days out from the current date, marking when they next need to be billed.

To run tests - which, among other things, _do_ force the payment gateway to throw the timeout many times in a row - use the `npm run test` or `yarn test` commands.

## How it works ##

**The payment gateway**

The payment gateway endpoint (`/api/v1/payment`) first checks for valid Authorization HTTP headers. If those are valid, it proceeds to generate a random number between 0 and 2. Depending on the number, the gateway returns one of its three possible responses: sufficient funds, insufficient funds, or timeout.

From `src/payments/index.ts`:

```typescript
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
```

**The client API**

Our client API first does a very basic duck typing test to check if the request body matches the shape we're looking for. If so, it sets up a do-while loop to ping the payment gateway a maximum of three times. If the API gets a response other than a timeout during those attempts, it sends the appropriate response to the client. If not, it sends a 503.

From `src/api/index.ts`:

```typescript
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

            // At this point we've tried three times with no luck, time to send a 503 to the client.

            response.status(503);
            response.json(APIResponse(null, constants.SERVICE_UNAVAILABLE));
            return;

        }
```

**The mock database**

There's a call in the happy path above to insert customer data into the database. This is a very simple mock DB using a JavaScript closure to support methods for inserting, selecting all and clearing the "database."

From `src/db/index.ts`:

```typescript
const mockDatabase = () => {
    const rows: CustomerTableRow[] = [];

    return {
        insert(data: CustomerData): void {
            rows.push(Object.assign({}, data, { subscriptionDate: new Date() }));
        },
        selectAll(): CustomerTableRow[] {
            return rows;
        },
        clear(): void {
            rows.length = 0;
        }
    }
}
```

## Questions for the team ##

- How do you handle credit card number validation? I used a string because JavaScript numbers can only hold up to 16 digits, but I'm thinking there's got to be a better way than validating whether that string contains nothing but digits.
- I chose to return a 400 status code when the API finds out the customer has insufficient funds to subscribe. Is that an appropriate response? What do you use in similar cases?
- How much is too much information to expose to the client? For example, if we can't connect to a payment gateway, should we say that in our error message, or do you advocate a more generic "something went wrong" to avoid divulging too much?
- I lack Ruby experience, and I'm curious as to your thoughts on its pros and cons vs. something like Node for a back end. Where do the headaches occur with Ruby, and where does it shine for something like this?
- How do you securely store credit card information and other sensitive details? With a little more time, I would have like to salt credit card numbers before adding them to the database. Security/cryptography is by no means my strong suit but I'd love to learn more about it from the team.