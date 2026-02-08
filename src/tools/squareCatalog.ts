// Square Catalog tool — browses salon services and pricing

import {
  listCatalogServices,
  getCatalogItem,
  searchCatalogItems,
} from '@/lib/square/client'

type ProgressCallback = (progress: number, message?: string) => void

interface SquareCatalogArgs {
  action: string
  textFilter?: string
  itemId?: string
}

export async function squareCatalog(
  args: SquareCatalogArgs,
  onProgress?: ProgressCallback,
): Promise<unknown> {
  const { action } = args

  switch (action) {
    case 'list_services': {
      onProgress?.(10, 'Fetching salon services...')
      const services = await listCatalogServices()
      onProgress?.(100, `Found ${services.length} services`)
      return { services, count: services.length }
    }

    case 'get_item': {
      onProgress?.(10, 'Fetching catalog item...')
      const item = await getCatalogItem(args.itemId!)
      onProgress?.(100, item ? `Found: ${item.name}` : 'Item not found')
      return { item }
    }

    case 'search': {
      onProgress?.(10, `Searching catalog for "${args.textFilter}"...`)
      const services = await searchCatalogItems(args.textFilter!)
      onProgress?.(100, `Found ${services.length} matching items`)
      return { services, count: services.length }
    }

    default:
      throw new Error(`Unknown square_catalog action: ${action}`)
  }
}
