# Reimplement MessageList.tsx

## User Flow (<200 words)

User opens chat and sees a welcome screen with quick action chips. When they send a message (Q1), it appears immediately on the right as a coral gradient bubble.

If the assistant uses tools, tool cards appear below Q1 showing progress (spinner, progress bar, status text). Each tool has a colored theme: purple for knowledge base, blue for web search, green for web fetch.

When the assistant responds, the response streams character-by-character in a white bubble on the left. Tool cards remain above the response showing completion status and duration.

User sends Q2 → sees Q2 bubble → tool cards for Q2 → streaming A2 → final A2. The pattern continues for Q3, Q4, etc.

Scrolling is automatic to keep the latest content visible.

## Architecture (<200 words)

**File**: `src/components/chat/MessageList.tsx`

**Props**: `messages`, `historicalToolCalls`, `activeTools`, `streamingMessage`, `isLoading`

**Data relationships**:
- `ToolCall.message_id` links completed tools to assistant messages
- `UnifiedToolState.messageId` links active tools to pending responses

**Render logic**:
```
For each message:
  - If assistant: render tools (by message_id) THEN bubble
  - If user + last: render bubble THEN activeTools
After messages: render streamingMessage, then loading indicator
```

**Sub-components**: WelcomeScreen, MessageBubble, UserBubble, AssistantBubble, HistoricalToolCard, ActiveToolCard, StreamingBubble, LoadingIndicator

**Styling**: toolConfig object maps tool names to color themes.
