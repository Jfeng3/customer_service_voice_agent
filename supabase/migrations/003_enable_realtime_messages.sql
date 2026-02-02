-- Enable realtime for messages table so frontend receives postgres_changes events
-- This allows isLoading to reset when assistant message is inserted
ALTER PUBLICATION supabase_realtime ADD TABLE csva_messages;
