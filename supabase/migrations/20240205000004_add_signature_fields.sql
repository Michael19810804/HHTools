-- Add fields column to signers table to store signature placement configuration
ALTER TABLE signers 
ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb;

-- Add field_id to signatures table to link a signature to a specific field requirement
ALTER TABLE signatures
ADD COLUMN IF NOT EXISTS field_id VARCHAR(50);

-- Create index for field_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_signatures_field_id ON signatures(field_id);
