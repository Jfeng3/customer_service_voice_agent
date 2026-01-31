// Order lookup tool

interface OrderDetails {
  orderId: string
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: { name: string; quantity: number; price: number }[]
  total: number
  shippingAddress: string
  trackingNumber?: string
  estimatedDelivery?: string
  orderDate: string
}

// Mock order database
const orderDatabase: Record<string, OrderDetails> = {
  'ORD-12345': {
    orderId: 'ORD-12345',
    status: 'shipped',
    items: [
      { name: 'Wireless Headphones', quantity: 1, price: 79.99 },
      { name: 'Phone Case', quantity: 2, price: 19.99 },
    ],
    total: 119.97,
    shippingAddress: '123 Main St, City, State 12345',
    trackingNumber: '1Z999AA10123456784',
    estimatedDelivery: '2024-02-05',
    orderDate: '2024-01-28',
  },
  'ORD-67890': {
    orderId: 'ORD-67890',
    status: 'processing',
    items: [{ name: 'Laptop Stand', quantity: 1, price: 49.99 }],
    total: 49.99,
    shippingAddress: '456 Oak Ave, Town, State 67890',
    orderDate: '2024-01-30',
  },
  'ORD-11111': {
    orderId: 'ORD-11111',
    status: 'delivered',
    items: [
      { name: 'USB-C Cable', quantity: 3, price: 12.99 },
      { name: 'Wall Charger', quantity: 1, price: 24.99 },
    ],
    total: 63.96,
    shippingAddress: '789 Pine Rd, Village, State 11111',
    trackingNumber: '1Z999AA10987654321',
    estimatedDelivery: '2024-01-25',
    orderDate: '2024-01-20',
  },
}

export async function orderLookup(
  orderId: string,
  onProgress?: (progress: number, message?: string) => void
): Promise<{ order: OrderDetails | null; message: string }> {
  onProgress?.(25, 'Searching order database...')
  await sleep(300)

  onProgress?.(50, `Looking up order ${orderId}...`)
  await sleep(200)

  const order = orderDatabase[orderId.toUpperCase()]

  onProgress?.(75, 'Retrieving order details...')
  await sleep(200)

  onProgress?.(100, 'Order lookup complete')

  if (!order) {
    return {
      order: null,
      message: `Order ${orderId} not found. Please check the order ID and try again.`,
    }
  }

  return {
    order,
    message: `Found order ${orderId}`,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
