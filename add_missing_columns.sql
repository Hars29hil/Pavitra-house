-- ============================================
-- Add Missing Columns to Students Table
-- ============================================
-- This script ensures all required columns exist in the students table

-- Add 'college' column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS college TEXT;

-- Add 'job' column if it doesn't exist (for alumni)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS job TEXT;

-- Add 'profile_image' column if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS profile_image TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN students.college IS 'College or university name where the student studies';
COMMENT ON COLUMN students.job IS 'Job title and company for alumni (e.g., Software Engineer @ Google)';
COMMENT ON COLUMN students.profile_image IS 'URL to the student profile image (hosted on ImgBB or similar)';

-- Verify all columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'students'
ORDER BY ordinal_position;

-- ============================================
-- Expected Columns in Students Table:
-- ============================================
-- id (uuid)
-- room_no (text)
-- name (text)
-- age (integer)
-- dob (text or date)
-- mobile (text)
-- email (text)
-- degree (text)
-- year (text)
-- result (text)
-- interest (text)
-- is_alumni (boolean)
-- created_at (timestamp)
-- profile_image (text)
-- job (text)
-- college (text)
-- ============================================
