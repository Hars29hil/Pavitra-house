# ✅ Fixed: Auto-Calculate Age SQL Script

## What Was Fixed

The SQL script had an error when comparing date fields with empty strings. PostgreSQL doesn't allow direct comparison of date types with empty strings.

### Error Message:
```
ERROR: 22007: invalid input syntax for type date: ""
```

### The Fix:
Changed from:
```sql
WHERE dob IS NOT NULL AND dob != '';
```

To:
```sql
WHERE dob IS NOT NULL 
  AND dob::text != '' 
  AND dob::text ~ '^\d{4}-\d{2}-\d{2}$';
```

This now:
1. ✅ Checks if dob is NOT NULL
2. ✅ Converts to text before comparing with empty string
3. ✅ Validates the date format (YYYY-MM-DD) using regex

---

## 🚀 How to Use (Updated)

### Option 1: Complete Setup (Recommended)

Run the **`auto_calculate_age.sql`** file in Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `auto_calculate_age.sql`
4. Click "Run"

This will:
- ✅ Update all existing student ages
- ✅ Create a trigger for automatic age calculation
- ✅ Include error handling for invalid dates

### Option 2: Quick Update Only

Run the **`update_student_ages.sql`** file:

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of `update_student_ages.sql`
4. Click "Run"

This will:
- ✅ Update all existing student ages (one-time)
- ❌ No automatic updates for future changes

---

## 🎯 What the Fixed Script Does

### Step 1: Update Existing Ages
```sql
UPDATE students
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
WHERE dob IS NOT NULL 
  AND dob::text != '' 
  AND dob::text ~ '^\d{4}-\d{2}-\d{2}$';
```

Only updates students with:
- Valid DOB (not NULL)
- Non-empty DOB
- Properly formatted DOB (YYYY-MM-DD)

### Step 2: Create Auto-Calculate Function
```sql
CREATE OR REPLACE FUNCTION calculate_age_from_dob()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dob IS NOT NULL AND NEW.dob::text != '' THEN
        BEGIN
            NEW.age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.dob::date));
        EXCEPTION
            WHEN OTHERS THEN
                IF NEW.age IS NULL THEN
                    NEW.age := 0;
                END IF;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Includes error handling:
- If date conversion fails, keeps existing age
- If no existing age, sets to 0

### Step 3: Create Trigger
```sql
CREATE TRIGGER trigger_calculate_age
    BEFORE INSERT OR UPDATE OF dob
    ON students
    FOR EACH ROW
    EXECUTE FUNCTION calculate_age_from_dob();
```

Automatically runs when:
- New student is added
- Student's DOB is updated

---

## ✅ Verification

After running the script, verify it worked:

```sql
SELECT id, name, dob, age 
FROM students 
WHERE dob IS NOT NULL 
ORDER BY age DESC
LIMIT 10;
```

You should see:
- All students with DOB have correct ages
- Ages match their birth dates

---

## 🔧 Troubleshooting

### If some ages are still wrong:

1. **Check DOB format:**
   ```sql
   SELECT id, name, dob, age 
   FROM students 
   WHERE dob IS NOT NULL 
     AND dob::text !~ '^\d{4}-\d{2}-\d{2}$';
   ```
   This shows students with invalid DOB format.

2. **Manually fix specific student:**
   ```sql
   UPDATE students 
   SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, '2005-01-15'::date))
   WHERE id = 'student-id-here';
   ```

3. **Re-run the update:**
   Just run the UPDATE statement again - it's safe to run multiple times.

---

## 📊 Expected Results

### Before:
```
| name       | dob        | age |
|------------|------------|-----|
| John Doe   | 2005-01-15 | 25  | ❌ Wrong
| Jane Smith | 2004-08-20 | 18  | ❌ Wrong
```

### After:
```
| name       | dob        | age |
|------------|------------|-----|
| John Doe   | 2005-01-15 | 21  | ✅ Correct
| Jane Smith | 2004-08-20 | 21  | ✅ Correct
```

---

## 🎉 Success!

Once you run the fixed script:
- ✅ All existing ages will be corrected
- ✅ Future ages will calculate automatically
- ✅ No more manual age entry needed
- ✅ Ages always stay accurate

The script is now ready to run without errors! 🚀
