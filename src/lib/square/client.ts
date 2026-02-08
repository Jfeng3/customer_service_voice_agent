import { SquareClient, SquareError, SquareEnvironment } from 'square'
import type { Square } from 'square'

// ---------------------------------------------------------------------------
// SDK initialization (module-level singleton, matching qstash/client.ts pattern)
// ---------------------------------------------------------------------------

const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN
const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox'
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID

if (!SQUARE_ACCESS_TOKEN) {
  console.warn('SQUARE_ACCESS_TOKEN not set - Square API will not work')
}
if (!SQUARE_LOCATION_ID) {
  console.warn('SQUARE_LOCATION_ID not set - Square API will not work')
}

export const squareClient = new SquareClient({
  token: SQUARE_ACCESS_TOKEN || '',
  environment:
    SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

function handleSquareError(error: unknown): never {
  if (error instanceof SquareError) {
    const messages = error.errors
      .map((e) => `[${e.category}] ${e.code}: ${e.detail ?? 'No details'}`)
      .join('; ')
    throw new Error(`Square API error (${error.statusCode}): ${messages}`)
  }
  throw error
}

// ---------------------------------------------------------------------------
// App-level types (simplified from SDK types, bigint → number for JSON safety)
// ---------------------------------------------------------------------------

export interface AppointmentSegment {
  durationMinutes: number | null
  serviceVariationId: string | null
  teamMemberId: string
  anyTeamMember?: boolean
}

export interface Availability {
  startAt: string
  locationId: string
  appointmentSegments: AppointmentSegment[]
}

export interface Booking {
  id: string
  version?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  startAt?: string | null
  locationId?: string | null
  customerId?: string | null
  customerNote?: string | null
  sellerNote?: string | null
  appointmentSegments?: AppointmentSegment[] | null
}

export interface TeamMemberBookingProfile {
  teamMemberId?: string
  displayName?: string
  description?: string
  isBookable?: boolean | null
  profileImageUrl?: string
}

export interface Customer {
  id: string
  createdAt?: string
  updatedAt?: string
  givenName?: string | null
  familyName?: string | null
  emailAddress?: string | null
  phoneNumber?: string | null
  companyName?: string | null
  nickname?: string | null
  birthday?: string | null
  note?: string | null
  referenceId?: string | null
}

export interface CatalogServiceVariation {
  id: string
  name?: string | null
  priceCents?: number | null
  currency?: string
  serviceDurationMs?: number | null
  availableForBooking?: boolean | null
  teamMemberIds?: string[] | null
}

export interface CatalogService {
  id: string
  name?: string | null
  description?: string | null
  variations: CatalogServiceVariation[]
}

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

export interface SearchAvailabilityParams {
  startAt: string
  endAt: string
  locationId?: string
  serviceVariationId?: string
  teamMemberIds?: string[]
}

export interface CreateBookingParams {
  startAt: string
  customerId: string
  appointmentSegments: {
    teamMemberId: string
    serviceVariationId: string
    durationMinutes?: number
    serviceVariationVersion?: bigint
  }[]
  locationId?: string
  customerNote?: string
}

export interface ListBookingsParams {
  customerId?: string
  teamMemberId?: string
  locationId?: string
  startAtMin?: string
  startAtMax?: string
  limit?: number
}

export interface SearchCustomersParams {
  emailAddress?: string
  phoneNumber?: string
  givenName?: string
  familyName?: string
}

export interface CreateCustomerParams {
  givenName?: string
  familyName?: string
  emailAddress?: string
  phoneNumber?: string
  note?: string
  companyName?: string
  birthday?: string
}

export interface UpdateCustomerParams {
  customerId: string
  givenName?: string | null
  familyName?: string | null
  emailAddress?: string | null
  phoneNumber?: string | null
  note?: string | null
  companyName?: string | null
  birthday?: string | null
}

// ---------------------------------------------------------------------------
// Internal mapping helpers
// ---------------------------------------------------------------------------

function mapAppointmentSegment(
  seg: Square.AppointmentSegment,
): AppointmentSegment {
  return {
    durationMinutes: seg.durationMinutes ?? null,
    serviceVariationId: seg.serviceVariationId ?? null,
    teamMemberId: seg.teamMemberId,
    anyTeamMember: seg.anyTeamMember,
  }
}

function mapBooking(b: Square.Booking): Booking {
  return {
    id: b.id!,
    version: b.version,
    status: b.status,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    startAt: b.startAt ?? null,
    locationId: b.locationId ?? null,
    customerId: b.customerId ?? null,
    customerNote: b.customerNote ?? null,
    sellerNote: b.sellerNote ?? null,
    appointmentSegments:
      b.appointmentSegments?.map(mapAppointmentSegment) ?? null,
  }
}

function mapCustomer(c: Square.Customer): Customer {
  return {
    id: c.id!,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    givenName: c.givenName ?? null,
    familyName: c.familyName ?? null,
    emailAddress: c.emailAddress ?? null,
    phoneNumber: c.phoneNumber ?? null,
    companyName: c.companyName ?? null,
    nickname: c.nickname ?? null,
    birthday: c.birthday ?? null,
    note: c.note ?? null,
    referenceId: c.referenceId ?? null,
  }
}

function mapCatalogServiceVariation(
  obj: Square.CatalogObject,
): CatalogServiceVariation | null {
  if (obj.type !== 'ITEM_VARIATION') return null
  const v = obj.itemVariationData
  if (!v) return null
  return {
    id: obj.id,
    name: v.name ?? null,
    priceCents: v.priceMoney?.amount != null ? Number(v.priceMoney.amount) : null,
    currency: v.priceMoney?.currency,
    serviceDurationMs: v.serviceDuration != null ? Number(v.serviceDuration) : null,
    availableForBooking: v.availableForBooking ?? null,
    teamMemberIds: v.teamMemberIds ?? null,
  }
}

function mapCatalogService(obj: Square.CatalogObject): CatalogService | null {
  if (obj.type !== 'ITEM') return null
  const item = obj.itemData
  if (!item) return null
  const variations = (item.variations ?? [])
    .map(mapCatalogServiceVariation)
    .filter((v): v is CatalogServiceVariation => v !== null)
  return {
    id: obj.id,
    name: item.name ?? null,
    description: item.descriptionPlaintext ?? item.description ?? null,
    variations,
  }
}

// ---------------------------------------------------------------------------
// Bookings API
// ---------------------------------------------------------------------------

export async function searchAvailability(
  params: SearchAvailabilityParams,
): Promise<Availability[]> {
  try {
    const segmentFilters: Square.SegmentFilter[] | undefined =
      params.serviceVariationId
        ? [
            {
              serviceVariationId: params.serviceVariationId,
              teamMemberIdFilter: params.teamMemberIds
                ? { all: params.teamMemberIds }
                : undefined,
            },
          ]
        : undefined

    const response = await squareClient.bookings.searchAvailability({
      query: {
        filter: {
          startAtRange: {
            startAt: params.startAt,
            endAt: params.endAt,
          },
          locationId: params.locationId ?? SQUARE_LOCATION_ID,
          segmentFilters,
        },
      },
    })

    return (response.availabilities ?? []).map((a) => ({
      startAt: a.startAt ?? '',
      locationId: a.locationId ?? '',
      appointmentSegments:
        a.appointmentSegments?.map(mapAppointmentSegment) ?? [],
    }))
  } catch (error) {
    handleSquareError(error)
  }
}

export async function createBooking(
  params: CreateBookingParams,
): Promise<Booking> {
  try {
    const response = await squareClient.bookings.create({
      idempotencyKey: crypto.randomUUID(),
      booking: {
        locationId: params.locationId ?? SQUARE_LOCATION_ID,
        startAt: params.startAt,
        customerId: params.customerId,
        customerNote: params.customerNote,
        appointmentSegments: params.appointmentSegments.map((seg) => ({
          teamMemberId: seg.teamMemberId,
          serviceVariationId: seg.serviceVariationId,
          durationMinutes: seg.durationMinutes,
          serviceVariationVersion: seg.serviceVariationVersion,
        })),
      },
    })

    return mapBooking(response.booking!)
  } catch (error) {
    handleSquareError(error)
  }
}

export async function cancelBooking(
  bookingId: string,
  bookingVersion?: number,
): Promise<Booking> {
  try {
    const response = await squareClient.bookings.cancel({
      bookingId,
      idempotencyKey: crypto.randomUUID(),
      bookingVersion,
    })

    return mapBooking(response.booking!)
  } catch (error) {
    handleSquareError(error)
  }
}

export async function listBookings(
  params?: ListBookingsParams,
): Promise<Booking[]> {
  try {
    const bookings: Booking[] = []
    const pager = await squareClient.bookings.list({
      limit: params?.limit,
      customerId: params?.customerId,
      teamMemberId: params?.teamMemberId,
      locationId: params?.locationId ?? SQUARE_LOCATION_ID,
      startAtMin: params?.startAtMin,
      startAtMax: params?.startAtMax,
    })

    for await (const booking of pager) {
      bookings.push(mapBooking(booking))
    }

    return bookings
  } catch (error) {
    handleSquareError(error)
  }
}

export async function listTeamMemberBookingProfiles(): Promise<
  TeamMemberBookingProfile[]
> {
  try {
    const profiles: TeamMemberBookingProfile[] = []
    const pager = await squareClient.bookings.teamMemberProfiles.list({
      bookableOnly: true,
      locationId: SQUARE_LOCATION_ID,
    })

    for await (const profile of pager) {
      profiles.push({
        teamMemberId: profile.teamMemberId,
        displayName: profile.displayName,
        description: profile.description,
        isBookable: profile.isBookable ?? null,
        profileImageUrl: profile.profileImageUrl,
      })
    }

    return profiles
  } catch (error) {
    handleSquareError(error)
  }
}

// ---------------------------------------------------------------------------
// Customers API
// ---------------------------------------------------------------------------

export async function searchCustomers(
  params: SearchCustomersParams,
): Promise<Customer[]> {
  try {
    const filter: Square.CustomerFilter = {}
    if (params.emailAddress) {
      filter.emailAddress = { fuzzy: params.emailAddress }
    }
    if (params.phoneNumber) {
      filter.phoneNumber = { fuzzy: params.phoneNumber }
    }

    const response = await squareClient.customers.search({
      query: { filter },
      limit: BigInt(50),
    })

    return (response.customers ?? []).map(mapCustomer)
  } catch (error) {
    handleSquareError(error)
  }
}

export async function createCustomer(
  params: CreateCustomerParams,
): Promise<Customer> {
  try {
    const response = await squareClient.customers.create({
      idempotencyKey: crypto.randomUUID(),
      givenName: params.givenName,
      familyName: params.familyName,
      emailAddress: params.emailAddress,
      phoneNumber: params.phoneNumber,
      note: params.note,
      companyName: params.companyName,
      birthday: params.birthday,
    })

    return mapCustomer(response.customer!)
  } catch (error) {
    handleSquareError(error)
  }
}

export async function getCustomer(customerId: string): Promise<Customer> {
  try {
    const response = await squareClient.customers.get({ customerId })
    return mapCustomer(response.customer!)
  } catch (error) {
    handleSquareError(error)
  }
}

export async function updateCustomer(
  params: UpdateCustomerParams,
): Promise<Customer> {
  try {
    const response = await squareClient.customers.update({
      customerId: params.customerId,
      givenName: params.givenName ?? undefined,
      familyName: params.familyName ?? undefined,
      emailAddress: params.emailAddress ?? undefined,
      phoneNumber: params.phoneNumber ?? undefined,
      note: params.note ?? undefined,
      companyName: params.companyName ?? undefined,
      birthday: params.birthday ?? undefined,
    })

    return mapCustomer(response.customer!)
  } catch (error) {
    handleSquareError(error)
  }
}

// ---------------------------------------------------------------------------
// Catalog API
// ---------------------------------------------------------------------------

export async function listCatalogServices(): Promise<CatalogService[]> {
  try {
    const services: CatalogService[] = []
    const pager = await squareClient.catalog.list({
      types: 'ITEM',
    })

    for await (const obj of pager) {
      if (obj.type === 'ITEM' && obj.itemData?.productType === 'APPOINTMENTS_SERVICE') {
        const service = mapCatalogService(obj)
        if (service) services.push(service)
      }
    }

    return services
  } catch (error) {
    handleSquareError(error)
  }
}

export async function getCatalogItem(
  itemId: string,
): Promise<CatalogService | null> {
  try {
    const response = await squareClient.catalog.batchGet({
      objectIds: [itemId],
      includeRelatedObjects: true,
    })

    const obj = response.objects?.[0]
    if (!obj) return null
    return mapCatalogService(obj)
  } catch (error) {
    handleSquareError(error)
  }
}

export async function searchCatalogItems(
  textFilter: string,
): Promise<CatalogService[]> {
  try {
    const response = await squareClient.catalog.search({
      objectTypes: ['ITEM'],
      query: {
        textQuery: {
          keywords: [textFilter],
        },
      },
      includeRelatedObjects: true,
    })

    return (response.objects ?? [])
      .map(mapCatalogService)
      .filter((s): s is CatalogService => s !== null)
  } catch (error) {
    handleSquareError(error)
  }
}
