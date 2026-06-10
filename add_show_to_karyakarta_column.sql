-- Add show_to_karyakarta column to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='show_to_karyakarta') THEN
        ALTER TABLE tasks ADD COLUMN show_to_karyakarta BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
