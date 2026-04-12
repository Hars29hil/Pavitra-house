# 🎂 Auto-Calculate Student Age from Date of Birth

## Overview
The system now automatically calculates and updates student ages based on their Date of Birth (DOB). This ensures ages are always accurate and up-to-date.

---

## 🚀 Quick Setup (Database)

### Step 1: Run SQL Script in Supabase

Go to **Supabase Dashboard** → **SQL Editor** → **New Query** and run:

```sql
-- Update all existing students' ages
UPDATE students
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
WHERE dob IS NOT NULL AND dob != '';

-- Create function to calculate age
CREATE OR REPLACE FUNCTION calculate_age_from_dob()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dob IS NOT NULL AND NEW.dob != '' THEN
        NEW.age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.dob::date));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic age calculation
DROP TRIGGER IF EXISTS trigger_calculate_age ON students;

CREATE TRIGGER trigger_calculate_age
    BEFORE INSERT OR UPDATE OF dob
    ON students
    FOR EACH ROW
    EXECUTE FUNCTION calculate_age_from_dob();
```

### What This Does:
1. ✅ **Updates all existing students** with correct ages
2. ✅ **Creates a database trigger** that auto-calculates age whenever:
   - A new student is added
   - A student's DOB is updated

---

## 📱 Frontend Auto-Calculation

The frontend now automatically calculates age in three places:

### 1. **Add/Edit Student Form**
- When you select a DOB using the date picker
- Age field is automatically filled
- Already implemented ✅

### 2. **Excel Bulk Upload**
- When uploading students via Excel
- Age is calculated from DOB column
- If DOB is missing, uses the age from Excel
- **Updated** ✅

### 3. **Manual Entry**
- Age field is still editable for manual corrections
- But recommended to use DOB for accuracy

---

## 📊 How It Works

### Database Level (Automatic):
```
Student Added/Updated → DOB Changed → Trigger Fires → Age Calculated → Saved
```

### Frontend Level (Immediate):
```
DOB Selected → calculateAge() → Age Field Updated → Form Submitted
```

### Excel Upload (Batch):
```
Excel Uploaded → Each Row Processed → Age Calculated from DOB → All Saved
```

---

## 🎯 Usage Examples

### Example 1: Adding a New Student
1. Fill in student details
2. Select DOB: **January 15, 2005**
3. Age field automatically shows: **21** (as of 2026)
4. Submit form

### Example 2: Excel Upload
Your Excel file:
```
| name      | dob        | roomNo |
|-----------|------------|--------|
| John Doe  | 2004-05-20 | 101    |
| Jane Smith| 2005-08-15 | 102    |
```

After upload:
- John Doe: Age = 21
- Jane Smith: Age = 20

### Example 3: Updating DOB
1. Edit student profile
2. Change DOB from **2005-01-15** to **2004-01-15**
3. Age automatically updates from **21** to **22**

---

## 📁 Files Created/Modified

### New Files:
1. **`update_student_ages.sql`** - Simple SQL to update all ages
2. **`auto_calculate_age.sql`** - Complete setup with trigger
3. **`src/lib/dateUtils.ts`** - Age calculation utility function

### Modified Files:
1. **`src/components/BulkUpdate.tsx`** - Auto-calculate age during Excel upload
2. **`src/pages/AddStudent.tsx`** - Already had age calculation (verified)

---

## 🔧 Utility Function

Created a reusable utility function in `src/lib/dateUtils.ts`:

```typescript
import { calculateAge } from '@/lib/dateUtils';

// Usage
const age = calculateAge('2005-01-15'); // Returns 21
```

This function:
- Takes DOB in `YYYY-MM-DD` format
- Returns age in years
- Handles birthday not yet occurred this year
- Returns 0 if DOB is invalid/empty

---

## ✅ Benefits

1. **Accuracy**: Ages are always calculated correctly
2. **Automation**: No manual age entry needed
3. **Consistency**: Same calculation logic everywhere
4. **Maintenance**: Ages update automatically as time passes
5. **Error Prevention**: Eliminates human error in age entry

---

## 🎓 Age Calculation Logic

The age calculation considers:
- Current year - Birth year
- Adjusts if birthday hasn't occurred yet this year
- Example:
  - Today: January 18, 2026
  - DOB: March 15, 2005
  - Age: 20 (not 21, because birthday is in March)

---

## 🔄 Keeping Ages Up-to-Date

### Option 1: Database Trigger (Recommended)
- Ages update automatically when DOB changes
- No manual intervention needed

### Option 2: Periodic Update (Optional)
Run this SQL annually to refresh all ages:
```sql
UPDATE students
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
WHERE dob IS NOT NULL;
```

### Option 3: Frontend Display (Future Enhancement)
Instead of storing age, calculate it on-the-fly when displaying:
```typescript
// Display age without storing it
const displayAge = calculateAge(student.dob);
```

---

## 🐛 Troubleshooting

### Ages not updating?
1. Check if trigger is created:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_calculate_age';
   ```

2. Manually update ages:
   ```sql
   UPDATE students SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
   WHERE dob IS NOT NULL;
   ```

### Excel upload not calculating age?
1. Make sure DOB column exists in Excel
2. DOB should be in `YYYY-MM-DD` format
3. Check browser console for errors

---

## 📝 Notes

- Age field is still stored in database for backward compatibility
- You can still manually edit age if needed
- DOB is the source of truth for age calculation
- Empty/invalid DOB will result in age = 0 or use existing age value
