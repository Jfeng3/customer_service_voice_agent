// Square Customers tool — manages customer profiles

import {
  searchCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
} from '@/lib/square/client'

type ProgressCallback = (progress: number, message?: string) => void

interface SquareCustomersArgs {
  action: string
  emailAddress?: string
  phoneNumber?: string
  givenName?: string
  familyName?: string
  customerId?: string
  note?: string
  companyName?: string
  birthday?: string
}

export async function squareCustomers(
  args: SquareCustomersArgs,
  onProgress?: ProgressCallback,
): Promise<unknown> {
  const { action } = args

  switch (action) {
    case 'search': {
      onProgress?.(10, 'Searching for customers...')
      const customers = await searchCustomers({
        emailAddress: args.emailAddress,
        phoneNumber: args.phoneNumber,
        givenName: args.givenName,
        familyName: args.familyName,
      })
      onProgress?.(100, `Found ${customers.length} customers`)
      return { customers, count: customers.length }
    }

    case 'create': {
      onProgress?.(10, 'Creating customer profile...')
      const customer = await createCustomer({
        givenName: args.givenName,
        familyName: args.familyName,
        emailAddress: args.emailAddress,
        phoneNumber: args.phoneNumber,
        note: args.note,
        companyName: args.companyName,
        birthday: args.birthday,
      })
      onProgress?.(100, `Customer created: ${customer.id}`)
      return { customer }
    }

    case 'get': {
      onProgress?.(10, 'Fetching customer profile...')
      const customer = await getCustomer(args.customerId!)
      onProgress?.(100, `Found customer: ${customer.givenName ?? customer.id}`)
      return { customer }
    }

    case 'update': {
      onProgress?.(10, 'Updating customer profile...')
      const customer = await updateCustomer({
        customerId: args.customerId!,
        givenName: args.givenName,
        familyName: args.familyName,
        emailAddress: args.emailAddress,
        phoneNumber: args.phoneNumber,
        note: args.note,
        companyName: args.companyName,
        birthday: args.birthday,
      })
      onProgress?.(100, `Customer ${customer.id} updated`)
      return { customer }
    }

    default:
      throw new Error(`Unknown square_customers action: ${action}`)
  }
}
