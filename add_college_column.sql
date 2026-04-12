-- Add missing 'college' column to students table
-- This column stores the college/university name for students

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS college TEXT;

-- Add comment to document the column
COMMENT ON COLUMN students.college IS 'College or university name where the student studies';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name = 'college';
