-- Enable pgvector extension
create extension if not exists vector;

-- Create memories table for agent long-term memory
create table if not exists csva_memories (
  id uuid primary key default gen_random_uuid(),
  session_id varchar(255) not null,
  user_id varchar(255), -- optional, for user-specific memories
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  memory_type varchar(50) default 'conversation', -- conversation, fact, preference, etc.
  importance float default 0.5, -- 0-1 score for memory importance
  metadata jsonb default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  accessed_at timestamp with time zone default now() -- track when memory was last retrieved
);

-- Create index for vector similarity search
create index if not exists csva_memories_embedding_idx
  on csva_memories
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create index for filtering
create index if not exists csva_memories_session_idx on csva_memories(session_id);
create index if not exists csva_memories_user_idx on csva_memories(user_id);
create index if not exists csva_memories_type_idx on csva_memories(memory_type);

-- Function to search memories by similarity
create or replace function search_memories(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5,
  filter_session_id varchar default null,
  filter_user_id varchar default null
)
returns table (
  id uuid,
  content text,
  memory_type varchar,
  importance float,
  metadata jsonb,
  similarity float,
  created_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  select
    m.id,
    m.content,
    m.memory_type,
    m.importance,
    m.metadata,
    1 - (m.embedding <=> query_embedding) as similarity,
    m.created_at
  from csva_memories m
  where
    (filter_session_id is null or m.session_id = filter_session_id)
    and (filter_user_id is null or m.user_id = filter_user_id)
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
