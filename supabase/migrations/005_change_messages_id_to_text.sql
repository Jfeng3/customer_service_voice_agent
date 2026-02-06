-- Change csva_messages.id from UUID to TEXT to support turn_xxx format
ALTER TABLE csva_messages
  ALTER COLUMN id TYPE TEXT;

-- Also change csva_tool_calls.message_id to TEXT for consistency
ALTER TABLE csva_tool_calls
  ALTER COLUMN message_id TYPE TEXT;
