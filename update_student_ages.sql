-- Update age for all students based on their DOB
-- This calculates the age from DOB to current date

UPDATE students
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
WHERE dob IS NOT NULL 
  AND dob::text != '' 
  AND dob::text ~ '^\d{4}-\d{2}-\d{2}$';

-- Verify the update
SELECT id, name, dob, age 
FROM students 
WHERE dob IS NOT NULL 
ORDER BY age DESC
LIMIT 20;
