import { Client } from '@upstash/qstash'

const qstashToken = process.env.QSTASH_TOKEN

if (!qstashToken) {
  console.warn('QSTASH_TOKEN not set - QStash will not work')
}

export const qstash = new Client({
  token: qstashToken || '',
})

// Publish a chat message to QStash for async processing
export async function publishChatMessage(sessionId: string, message: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const webhookUrl = `${appUrl}/api/qstash/webhook`

  const result = await qstash.queue({ queueName: 'call_center' }).enqueueJSON({
    url: webhookUrl,
    body: {
      sessionId,
      message,
      timestamp: Date.now(),
    },
    retries: 3,
  })

  return result
}
