import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@deepgram/sdk'

// Lazy initialize to avoid build-time errors
let deepgram: ReturnType<typeof createClient> | null = null

function getDeepgramClient() {
  if (!deepgram) {
    if (!process.env.DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY is not configured')
    }
    deepgram = createClient(process.env.DEEPGRAM_API_KEY)
  }
  return deepgram
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Transcribe with Deepgram
    const client = getDeepgramClient()
    const { result, error } = await client.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: 'nova-2',
        language: 'en',
        smart_format: true,  // Adds punctuation
        punctuate: true,
        diarize: false,      // Single speaker
      }
    )

    if (error) {
      console.error('Deepgram error:', error)
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 500 }
      )
    }

    const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || ''

    return NextResponse.json({
      transcript,
      confidence: result.results?.channels[0]?.alternatives[0]?.confidence || 0,
    })
  } catch (error) {
    console.error('Voice input error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
