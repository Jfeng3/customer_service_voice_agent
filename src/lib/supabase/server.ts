// Supabase client for server (uses secret key, bypasses RLS)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)

// Helper to broadcast events to a session channel
export async function broadcastEvent(
  sessionId: string,
  event: string,
  payload: Record<string, unknown>
) {
  const channel = supabaseAdmin.channel(`session:${sessionId}`)

  await channel.subscribe()

  await channel.send({
    type: 'broadcast',
    event,
    payload,
  })

  await supabaseAdmin.removeChannel(channel)
}
