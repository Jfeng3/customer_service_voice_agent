-- Add turn_id column to csva_messages
-- turn_id groups user message and assistant message into a single turn

ALTER TABLE csva_messages
  ADD COLUMN turn_id TEXT;

-- Change id back to UUID (revert 005 change for user messages)
-- Note: Existing turn_xxx ids will remain as text, new ones will be UUIDs
-- For a clean slate, you may want to truncate the table first

-- Create index for efficient turn lookups
CREATE INDEX IF NOT EXISTS csva_messages_turn_id_idx ON csva_messages(turn_id);
