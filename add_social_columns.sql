-- ============================================
-- Add Social Media Columns to Students Table
-- ============================================
-- This script adds the linkedin and social_link columns to the students table.
-- Copy and run this in your Supabase SQL Editor.

-- Add columns
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS social_link TEXT;

-- Add comments for documentation
COMMENT ON COLUMN students.linkedin IS 'URL to the student LinkedIn profile';
COMMENT ON COLUMN students.social_link IS 'URL to other student social media profiles (e.g., Instagram, Facebook, X, etc.)';

-- Verify columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('linkedin', 'social_link');
