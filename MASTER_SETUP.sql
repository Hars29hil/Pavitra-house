-- ============================================================
-- 🚀 HOSTEL HUB ADMIN - MASTER SUPABASE SETUP SCRIPT
-- ============================================================
-- Run this ENTIRE file in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- It is safe to run multiple times (idempotent).
-- ============================================================


-- ============================================================
-- STEP 1: Enable Required Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- STEP 2: Create `students` Table
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_no TEXT,
    name TEXT NOT NULL,
    age INTEGER,
    dob TEXT,
    mobile TEXT,
    email TEXT,
    degree TEXT,
    year TEXT,
    result TEXT,
    interest TEXT,
    is_alumni BOOLEAN DEFAULT FALSE,
    profile_image TEXT,
    job TEXT,
    college TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all" ON students;
CREATE POLICY "Enable read/write for all" ON students FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- STEP 3: Add Any Missing Columns to `students` (safe to re-run)
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS job TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image TEXT;

COMMENT ON COLUMN students.college IS 'College or university name where the student studies';
COMMENT ON COLUMN students.job IS 'Job title and company for alumni (e.g., Software Engineer @ Google)';
COMMENT ON COLUMN students.profile_image IS 'URL to the student profile image (hosted on ImgBB or similar)';


-- ============================================================
-- STEP 4: Create `student_results` Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    semester TEXT NOT NULL,
    sgpa TEXT NOT NULL,
    cgpa TEXT NOT NULL,
    backlogs INTEGER DEFAULT 0,
    exam_month_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.student_results;
CREATE POLICY "Allow public read access" ON public.student_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.student_results;
CREATE POLICY "Allow all access to authenticated users" ON public.student_results FOR ALL USING (auth.role() = 'authenticated');


-- ============================================================
-- STEP 5: Create `categories` Table
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'main' or 'sub'
    parent_id TEXT,               -- UUID reference to parent category
    student_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all" ON categories;
CREATE POLICY "Enable read/write for all" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Fix type constraint (drop old and re-create)
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;
ALTER TABLE categories ADD CONSTRAINT categories_type_check CHECK (type IN ('main', 'sub'));

-- Add missing columns if table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='student_ids') THEN
        ALTER TABLE categories ADD COLUMN student_ids TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='name') THEN
        ALTER TABLE categories ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='type') THEN
        ALTER TABLE categories ADD COLUMN type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='parent_id') THEN
        ALTER TABLE categories ADD COLUMN parent_id TEXT;
    END IF;
END $$;


-- ============================================================
-- STEP 6: Create `tasks` Table
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending',      -- 'pending' or 'done'
    assigned_to TEXT,                   -- Student ID
    assigned_to_name TEXT,
    category TEXT,
    description TEXT,
    is_practice_question BOOLEAN DEFAULT FALSE,
    question_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all" ON tasks;
CREATE POLICY "Enable read/write for all" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Add missing columns if table already existed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_to') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='assigned_to_name') THEN
        ALTER TABLE tasks ADD COLUMN assigned_to_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='is_practice_question') THEN
        ALTER TABLE tasks ADD COLUMN is_practice_question BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='question_content') THEN
        ALTER TABLE tasks ADD COLUMN question_content TEXT;
    END IF;
END $$;


-- ============================================================
-- STEP 7: Create `education_resources` Table
-- ============================================================
CREATE TABLE IF NOT EXISTS education_resources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('video', 'link')),
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE education_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all" ON education_resources;
CREATE POLICY "Enable read/write for all" ON education_resources FOR ALL USING (true) WITH CHECK (true);


-- ============================================================
-- STEP 8: Create `settings` Table
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read/write for all" ON settings;
CREATE POLICY "Enable read/write for all" ON settings FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default settings values
INSERT INTO settings (key, value) VALUES
    ('birthday_template', 'Happy Birthday, {name}! 🎉🎂 Wishing you a fantastic day filled with joy and happiness!'),
    ('birthday_auto_send', 'false'),
    ('birthday_auto_time', '09:00'),
    ('birthday_last_sent', '')
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- STEP 9: Auto-Calculate Age from DOB (Trigger Function)
-- ============================================================

-- Update all existing students' ages based on their DOB
UPDATE students
SET age = EXTRACT(YEAR FROM AGE(CURRENT_DATE, dob::date))
WHERE dob IS NOT NULL
  AND dob::text != ''
  AND dob::text ~ '^\d{4}-\d{2}-\d{2}$';

-- Create the trigger function
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

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trigger_calculate_age ON students;
CREATE TRIGGER trigger_calculate_age
    BEFORE INSERT OR UPDATE OF dob
    ON students
    FOR EACH ROW
    EXECUTE FUNCTION calculate_age_from_dob();


-- ============================================================
-- ✅ VERIFICATION QUERIES
-- (Run these separately to confirm everything was created)
-- ============================================================

-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check students columns:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position;

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- ============================================================
-- 🎉 Setup Complete!
-- Tables created: students, student_results, categories, tasks,
--                 education_resources, settings
-- Triggers created: trigger_calculate_age (on students)
-- ============================================================
