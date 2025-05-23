-- Add company field to content_requests table
ALTER TABLE content_requests 
ADD COLUMN IF NOT EXISTS company TEXT;
