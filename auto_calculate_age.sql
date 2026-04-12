-- ============================================
-- Auto-Calculate Student Age from DOB
-- ============================================

-- Step 1: Update all existing students' ages
UPDATE students
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
WHERE dob IS NOT NULL 
  AND dob::text != '' 
  AND dob::text ~ '^\d{4}-\d{2}-\d{2}$';

-- Step 2: Create a function to calculate age from DOB
CREATE OR REPLACE FUNCTION calculate_age_from_dob()
RETURNS TRIGGER AS $$
BEGIN
    -- If DOB is provided and valid, calculate age
    IF NEW.dob IS NOT NULL AND NEW.dob::text != '' THEN
        BEGIN
            NEW.age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.dob::date));
        EXCEPTION
            WHEN OTHERS THEN
                -- If date conversion fails, keep existing age or set to 0
                IF NEW.age IS NULL THEN
                    NEW.age := 0;
                END IF;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_age ON students;

-- Step 4: Create trigger to auto-calculate age on INSERT or UPDATE
CREATE TRIGGER trigger_calculate_age
    BEFORE INSERT OR UPDATE OF dob
    ON students
    FOR EACH ROW
    EXECUTE FUNCTION calculate_age_from_dob();

-- Step 5: Verify the results
SELECT 
    id, 
    name, 
    dob, 
    age,
    CASE 
        WHEN dob IS NOT NULL AND dob::text != '' THEN 
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
        ELSE 
            age 
    END as calculated_age
FROM students 
WHERE dob IS NOT NULL 
ORDER BY name
LIMIT 20;

-- ============================================
-- What this does:
-- 1. Updates all existing students with correct age
-- 2. Creates a function to calculate age from DOB
-- 3. Creates a trigger that automatically calculates age
--    whenever a student is added or their DOB is updated
-- 4. Includes error handling for invalid dates
-- ============================================
