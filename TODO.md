### Fake payment gateway ###

- Check auth headers
    - If basic auth headers don't match `billing`, `gateway`
        - Return a 401 unauthorized
- Generate a random number between 0 and 2
    - If 0
        - return a Response object noting the payment processed
    - If 1
        - return a Response object noting insufficient funds
    - if 2
        - return a 503 service unavailable

### Customer-facing API ###

- Receive a customer POST request with data for customer name, credit card number, expiration month, expiration year and CVC code
- Validate whether customer request matches data model
- (Optional) validate credit card information
    - If no match
        - Return 400 bad request
- Await payment gateway response
    - If successfully paid
        - Add customer data to the database (encrypt CC data)
        - Return 201 Created with data object noting a successful transaction
    - If insufficient funds
        - Return ?? status code with data object noting insufficient funds error
    - If timeout/503
        - Retry

- (Optional) Provide endpoint for listing all valid subscriptions and their next billing date


### Database ###

- Given an object matching the customer data model, insert it into a customers table, returning whether the insertion was successful