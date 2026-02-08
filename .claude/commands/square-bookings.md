Test and manage Square Bookings for Rainie Beauty via the Square API client.

If $ARGUMENTS is provided, use it as context for which action to perform. Otherwise, ask the user what they want to do.

## Available Actions

### 1. Search Availability
Find open appointment slots for a date range.
```typescript
import { searchAvailability } from '@/lib/square/client'
const results = await searchAvailability({
  startAt: '2025-01-15T09:00:00Z',  // ISO 8601
  endAt: '2025-01-15T18:00:00Z',
  serviceVariationId: 'optional-service-id',
  teamMemberIds: ['optional-team-member-id'],
})
```

### 2. Create Booking
Book an appointment for a customer. Requires customerId, startAt, and appointmentSegments.
```typescript
import { createBooking } from '@/lib/square/client'
const booking = await createBooking({
  startAt: '2025-01-15T10:00:00Z',
  customerId: 'CUSTOMER_ID',
  appointmentSegments: [{
    teamMemberId: 'TEAM_MEMBER_ID',
    serviceVariationId: 'SERVICE_VARIATION_ID',
  }],
  customerNote: 'optional note',
})
```

### 3. Cancel Booking
Cancel an existing booking by its ID.
```typescript
import { cancelBooking } from '@/lib/square/client'
const result = await cancelBooking('BOOKING_ID', bookingVersion)
```

### 4. List Bookings
List bookings filtered by customer, team member, or date range.
```typescript
import { listBookings } from '@/lib/square/client'
const bookings = await listBookings({
  customerId: 'optional',
  teamMemberId: 'optional',
  startAtMin: '2025-01-15T00:00:00Z',
  startAtMax: '2025-01-16T00:00:00Z',
  limit: 20,
})
```

### 5. List Team Members
Get all bookable staff members.
```typescript
import { listTeamMemberBookingProfiles } from '@/lib/square/client'
const profiles = await listTeamMemberBookingProfiles()
```

## Steps
1. Determine which action the user wants from the above list
2. Write a small test script or use the Node REPL to call the Square client function directly
3. Load environment variables from `.env.local` (SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT)
4. Execute the function and display the results
5. If there are errors, check the Square API response and suggest fixes
