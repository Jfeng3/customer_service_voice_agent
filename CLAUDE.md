# Customer Service Voice Agent

## Overview
A voice-enabled customer service agent built with Next.js, featuring real-time tool progress visibility and text-to-speech responses.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **LLM**: OpenRouter (anthropic/claude-opus-4.5)
- **TTS**: ElevenLabs
- **Queue**: QStash (Upstash)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime Broadcast
- **Observability**: Weave (W&B) for agent tracking

## Architecture
```
User → /api/chat → QStash → /api/qstash/webhook → OpenRouter
                                    ↓
                         Supabase Realtime Broadcast
                                    ↓
                              Frontend (SSE)
```

## Key Directories
- `src/app/api/` - API routes (chat, qstash webhook, voice output)
- `src/components/` - React components (chat, voice, tools)
- `src/hooks/` - Custom hooks (useChat, useRealtimeEvents, useVoice)
- `src/lib/` - API clients (openrouter, elevenlabs, qstash, supabase)
- `src/tools/` - Tool definitions and implementations

## Environment Variables
Required in `.env.local`:
- `OPENROUTER_API_KEY` - OpenRouter API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `QSTASH_TOKEN` - QStash token
- `QSTASH_CURRENT_SIGNING_KEY` - QStash signing key
- `QSTASH_NEXT_SIGNING_KEY` - QStash next signing key
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SECRET_KEY` - Supabase service role key
- `NEXT_PUBLIC_APP_URL` - Public URL (ngrok for local dev)
- `WANDB_API_KEY` - Weights & Biases API key (for agent observability)
- `WANDB_PROJECT` - W&B project name (default: customer-service-voice-agent)
- `FIRECRAWL_API_KEY` - Firecrawl API key (for website crawling)

## Database Tables
- `csva_messages` - Chat message history
- `csva_tool_calls` - Tool execution logs
- `csva_memories` - Long-term memory with vector embeddings (pgvector)

## Development
```bash
# Start ngrok tunnel (required for QStash callbacks)
# ALWAYS use this fixed ngrok URL for local testing:
ngrok http --url=tatiana-worried-nonfanatically.ngrok-free.dev 3000

# Start dev server
npm run dev
```

## Important
- **ngrok URL**: Always use `https://tatiana-worried-nonfanatically.ngrok-free.dev/` for local development
- This URL is configured in `.env.local` as `NEXT_PUBLIC_APP_URL`
- QStash webhooks will call back to this URL

## Conventions
- Use TypeScript strict mode
- Prefer async/await over .then() chains
- Use Supabase Realtime Broadcast for real-time events (no DB writes needed)
- Store persistent data (messages, tool calls) in Supabase tables with `csva_` prefix
