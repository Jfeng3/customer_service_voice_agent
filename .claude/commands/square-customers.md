Test and manage Square Customers for Rainie Beauty via the Square API client.

If $ARGUMENTS is provided, use it as context for which action to perform. Otherwise, ask the user what they want to do.

## Available Actions

### 1. Search Customers
Find customers by email, phone, or name.
```typescript
import { searchCustomers } from '@/lib/square/client'
const customers = await searchCustomers({
  emailAddress: 'jane@example.com',  // fuzzy match
  phoneNumber: '+1234567890',        // fuzzy match
  givenName: 'Jane',
  familyName: 'Doe',
})
```

### 2. Create Customer
Create a new customer profile.
```typescript
import { createCustomer } from '@/lib/square/client'
const customer = await createCustomer({
  givenName: 'Jane',
  familyName: 'Doe',
  emailAddress: 'jane@example.com',
  phoneNumber: '+1234567890',
  note: 'Prefers afternoon appointments',
  birthday: '1990-05-15',
})
```

### 3. Get Customer
Retrieve a customer by their Square customer ID.
```typescript
import { getCustomer } from '@/lib/square/client'
const customer = await getCustomer('CUSTOMER_ID')
```

### 4. Update Customer
Update an existing customer's details.
```typescript
import { updateCustomer } from '@/lib/square/client'
const customer = await updateCustomer({
  customerId: 'CUSTOMER_ID',
  phoneNumber: '+1987654321',
  note: 'Updated note',
})
```

## Steps
1. Determine which action the user wants from the above list
2. Write a small test script or use the Node REPL to call the Square client function directly
3. Load environment variables from `.env.local` (SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT)
4. Execute the function and display the results
5. If there are errors, check the Square API response and suggest fixes
