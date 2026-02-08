// Square Bookings tool — manages appointments at Rainie Beauty

import {
  searchAvailability,
  createBooking,
  cancelBooking,
  listBookings,
  listTeamMemberBookingProfiles,
} from '@/lib/square/client'

type ProgressCallback = (progress: number, message?: string) => void

interface SquareBookingsArgs {
  action: string
  startAt?: string
  endAt?: string
  serviceVariationId?: string
  teamMemberIds?: string[]
  customerId?: string
  appointmentSegments?: {
    teamMemberId: string
    serviceVariationId: string
    durationMinutes?: number
    serviceVariationVersion?: bigint
  }[]
  customerNote?: string
  bookingId?: string
  bookingVersion?: number
  teamMemberId?: string
  locationId?: string
  startAtMin?: string
  startAtMax?: string
  limit?: number
}

export async function squareBookings(
  args: SquareBookingsArgs,
  onProgress?: ProgressCallback,
): Promise<unknown> {
  const { action } = args

  switch (action) {
    case 'search_availability': {
      onProgress?.(10, 'Searching for available appointment slots...')
      const results = await searchAvailability({
        startAt: args.startAt!,
        endAt: args.endAt!,
        serviceVariationId: args.serviceVariationId,
        teamMemberIds: args.teamMemberIds,
        locationId: args.locationId,
      })
      onProgress?.(100, `Found ${results.length} available slots`)
      return { availabilities: results, count: results.length }
    }

    case 'create_booking': {
      onProgress?.(10, 'Creating appointment booking...')
      const booking = await createBooking({
        startAt: args.startAt!,
        customerId: args.customerId!,
        appointmentSegments: args.appointmentSegments!,
        locationId: args.locationId,
        customerNote: args.customerNote,
      })
      onProgress?.(100, `Booking created: ${booking.id}`)
      return { booking }
    }

    case 'cancel_booking': {
      onProgress?.(10, 'Cancelling booking...')
      const booking = await cancelBooking(
        args.bookingId!,
        args.bookingVersion,
      )
      onProgress?.(100, `Booking ${booking.id} cancelled`)
      return { booking }
    }

    case 'list_bookings': {
      onProgress?.(10, 'Listing bookings...')
      const bookings = await listBookings({
        customerId: args.customerId,
        teamMemberId: args.teamMemberId,
        locationId: args.locationId,
        startAtMin: args.startAtMin,
        startAtMax: args.startAtMax,
        limit: args.limit,
      })
      onProgress?.(100, `Found ${bookings.length} bookings`)
      return { bookings, count: bookings.length }
    }

    case 'list_team_members': {
      onProgress?.(10, 'Fetching bookable team members...')
      const profiles = await listTeamMemberBookingProfiles()
      onProgress?.(100, `Found ${profiles.length} team members`)
      return { teamMembers: profiles, count: profiles.length }
    }

    default:
      throw new Error(`Unknown square_bookings action: ${action}`)
  }
}
