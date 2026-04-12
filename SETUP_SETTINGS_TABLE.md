# 🔧 Fix: Settings Table Setup for Supabase

## Problem
The application is trying to access a `settings` table that doesn't exist in your Supabase database, causing 406 errors.

## Solution
You need to create the `settings` table in your Supabase database.

---

## Option 1: Using Supabase Dashboard (Recommended)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project: `gklpqutzwozwrwixwnyp`
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the SQL Script
Copy and paste the following SQL into the editor:

```sql
-- Create settings table for storing application settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read settings"
ON settings FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert settings
CREATE POLICY "Allow authenticated users to insert settings"
ON settings FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update settings
CREATE POLICY "Allow authenticated users to update settings"
ON settings FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete settings
CREATE POLICY "Allow authenticated users to delete settings"
ON settings FOR DELETE
TO authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default birthday settings
INSERT INTO settings (key, value) VALUES
    ('birthday_template', 'Happy Birthday, {name}! 🎉🎂 Wishing you a fantastic day filled with joy and happiness!'),
    ('birthday_auto_send', 'false'),
    ('birthday_auto_time', '09:00'),
    ('birthday_last_sent', '')
ON CONFLICT (key) DO NOTHING;
```

### Step 3: Execute
1. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
2. You should see "Success. No rows returned"

### Step 4: Verify
1. Go to **Table Editor** in the left sidebar
2. You should see a new `settings` table
3. Click on it to see the 4 default rows

---

## Option 2: Using the SQL File

I've created a file called `create_settings_table.sql` in your project root. You can:

1. Open it and copy the contents
2. Paste into Supabase SQL Editor
3. Run the query

---

## What This Creates

### Table Structure:
- **key** (TEXT, PRIMARY KEY): Setting identifier
- **value** (TEXT): Setting value
- **created_at** (TIMESTAMP): When the setting was created
- **updated_at** (TIMESTAMP): When the setting was last updated

### Default Settings:
- `birthday_template`: Default birthday message template
- `birthday_auto_send`: Auto-send enabled/disabled ("true"/"false")
- `birthday_auto_time`: Time to send wishes (HH:MM format)
- `birthday_last_sent`: Last date wishes were sent automatically

### Security:
- Row Level Security (RLS) enabled
- Only authenticated users can read/write settings
- Proper indexes for performance

---

## After Creating the Table

1. **Refresh your application** (Ctrl+R / Cmd+R)
2. **Navigate to Birthdays page**
3. The errors should be gone!
4. You can now use the auto-send feature

---

## Troubleshooting

### If you still see errors:
1. **Check if table exists:**
   - Go to Supabase Dashboard → Table Editor
   - Look for `settings` table

2. **Check RLS policies:**
   - Go to Supabase Dashboard → Authentication → Policies
   - Make sure the 4 policies for `settings` table exist

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

4. **Check authentication:**
   - Make sure you're logged in to the app
   - RLS policies require authenticated users

---

## Quick Verification Query

Run this in SQL Editor to verify the table was created correctly:

```sql
SELECT * FROM settings;
```

You should see 4 rows with the default birthday settings.
