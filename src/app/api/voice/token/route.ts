import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    if (!apiKey) {
      console.error('DEEPGRAM_API_KEY is not configured')
      return NextResponse.json(
        { error: 'DEEPGRAM_API_KEY is not configured' },
        { status: 500 }
      )
    }

    // For development: return the main API key directly
    // In production, you should create temporary keys with keys:write scope
    // or use a server-side WebSocket proxy
    //
    // To create temporary keys, your DEEPGRAM_API_KEY needs 'keys:write' scope.
    // You can create a new key with this scope in the Deepgram dashboard.
    //
    // For now, we'll return the main key with a short client-side timeout
    return NextResponse.json({ key: apiKey })
  } catch (error) {
    console.error('Failed to get Deepgram token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get token' },
      { status: 500 }
    )
  }
}
