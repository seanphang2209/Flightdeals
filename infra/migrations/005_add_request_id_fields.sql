-- 005_add_request_id_fields.sql
-- Add request_id fields to existing tables for better observability

-- Add request_id to search_logs table
ALTER TABLE search_logs ADD COLUMN request_id TEXT;

-- Add request_id to tracks table  
ALTER TABLE tracks ADD COLUMN request_id TEXT;

-- Create index for better performance on request_id lookups
CREATE INDEX IF NOT EXISTS idx_search_logs_request_id ON search_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_tracks_request_id ON tracks(request_id);
