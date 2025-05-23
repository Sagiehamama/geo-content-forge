-- Add company field to content_requests table
ALTER TABLE content_requests 
ADD COLUMN company TEXT;
