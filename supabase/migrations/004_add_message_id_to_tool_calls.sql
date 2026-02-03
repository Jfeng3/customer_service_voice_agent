-- Add message_id column to link tool calls to their parent assistant message
ALTER TABLE csva_tool_calls ADD COLUMN message_id UUID;

-- Create index for efficient lookups by message_id
CREATE INDEX idx_csva_tool_calls_message_id ON csva_tool_calls(message_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN csva_tool_calls.message_id IS 'References csva_messages.id - the assistant message this tool call belongs to';
