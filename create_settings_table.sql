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
