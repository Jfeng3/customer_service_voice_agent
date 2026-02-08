Test and manage Square Catalog for Rainie Beauty via the Square API client.

If $ARGUMENTS is provided, use it as context for which action to perform. Otherwise, ask the user what they want to do.

## Available Actions

### 1. List Services
List all bookable services with pricing and duration.
```typescript
import { listCatalogServices } from '@/lib/square/client'
const services = await listCatalogServices()
// Returns: { id, name, description, variations: [{ id, name, priceCents, currency, serviceDurationMs, availableForBooking, teamMemberIds }] }
```

### 2. Get Item
Get a single catalog item by ID.
```typescript
import { getCatalogItem } from '@/lib/square/client'
const item = await getCatalogItem('CATALOG_ITEM_ID')
```

### 3. Search Catalog
Search catalog items by text keyword.
```typescript
import { searchCatalogItems } from '@/lib/square/client'
const results = await searchCatalogItems('nail')
```

## Steps
1. Determine which action the user wants from the above list
2. Write a small test script or use the Node REPL to call the Square client function directly
3. Load environment variables from `.env.local` (SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT)
4. Execute the function and display the results
5. Format pricing nicely (priceCents / 100 = dollars, serviceDurationMs / 60000 = minutes)
6. If there are errors, check the Square API response and suggest fixes
