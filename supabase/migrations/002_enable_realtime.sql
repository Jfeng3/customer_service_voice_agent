-- Enable realtime for tool_calls table so frontend receives postgres_changes events
ALTER PUBLICATION supabase_realtime ADD TABLE csva_tool_calls;
