-- ============================================================
-- 🚀 HOSTEL HUB ADMIN - MASTER MYSQL SETUP SCRIPT
-- ============================================================
-- Run this script in your MySQL Database (e.g. via phpMyAdmin)
-- ============================================================

-- Create `students` Table
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    room_no TEXT,
    name VARCHAR(255) NOT NULL,
    age INT,
    dob VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    degree VARCHAR(100),
    year VARCHAR(50),
    result TEXT,
    interest TEXT,
    is_alumni BOOLEAN DEFAULT FALSE,
    profile_image TEXT,
    job TEXT,
    college TEXT,
    linkedin TEXT,
    social_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create `student_results` Table
CREATE TABLE IF NOT EXISTS student_results (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    sgpa VARCHAR(20) NOT NULL,
    cgpa VARCHAR(20) NOT NULL,
    backlogs INT DEFAULT 0,
    exam_month_year VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create `categories` Table
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,           -- 'main' or 'sub'
    parent_id VARCHAR(36),               -- Parent category ID reference
    student_ids TEXT,                    -- JSON array of student IDs (e.g. '["id1", "id2"]')
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create `tasks` Table
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    due_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',      -- 'pending' or 'done'
    assigned_to VARCHAR(36),                   -- Student ID
    assigned_to_name VARCHAR(255),
    category VARCHAR(255),
    description TEXT,
    is_practice_question BOOLEAN DEFAULT FALSE,
    question_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create `education_resources` Table
CREATE TABLE IF NOT EXISTS education_resources (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,                 -- 'video' or 'link'
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create `settings` Table
CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_settings_key ON settings(`key`);

-- Insert default settings values
INSERT INTO settings (`key`, value) VALUES
    ('birthday_template', 'Happy Birthday, {name}! 🎉🎂 Wishing you a fantastic day filled with joy and happiness!'),
    ('birthday_auto_send', 'false'),
    ('birthday_auto_time', '09:00'),
    ('birthday_last_sent', ''),
    ('whatsapp_node_url', 'http://localhost:4000')
ON DUPLICATE KEY UPDATE `key`=`key`;

-- Trigger to calculate student's age automatically from DOB on INSERT
DELIMITER //
CREATE TRIGGER trigger_calculate_age_insert
BEFORE INSERT ON students
FOR EACH ROW
BEGIN
    IF NEW.dob IS NOT NULL AND NEW.dob != '' AND NEW.dob REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        SET NEW.age = TIMESTAMPDIFF(YEAR, STR_TO_DATE(NEW.dob, '%Y-%m-%d'), CURDATE());
    END IF;
END //
DELIMITER ;

-- Trigger to calculate student's age automatically from DOB on UPDATE
DELIMITER //
CREATE TRIGGER trigger_calculate_age_update
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
    IF NEW.dob IS NOT NULL AND NEW.dob != '' AND NEW.dob REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
        SET NEW.age = TIMESTAMPDIFF(YEAR, STR_TO_DATE(NEW.dob, '%Y-%m-%d'), CURDATE());
    END IF;
END //
DELIMITER ;

-- Create `users` Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Hashed password
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default user credentials (password is 123456)
INSERT INTO users (id, email, password, name, role) VALUES
    ('8b1a8d05-4f40-42cf-9a99-b1eb3ad79eb6', 'harshil2937patel@gmail.com', '$2y$10$D5giHm4mm6YKDsCWQyb.POoJ6dT5kXTcorbxiwS1FB6Mar1XWvUQ2', 'Harshil', 'admin'),
    ('5c9e2b10-721d-4089-bb20-1a6125abc3f0', 'bhulkuanand36@gmail.com', '$2y$10$D5giHm4mm6YKDsCWQyb.POoJ6dT5kXTcorbxiwS1FB6Mar1XWvUQ2', 'Nand', 'admin')
ON DUPLICATE KEY UPDATE email=email;

-- ============================================================
2. -- 🛠️ ALTER COMMANDS FOR EXISTING DATABASE TABLES
-- ============================================================
-- If you already have the tables, run these ALTER statements in phpMyAdmin:
--
-- ALTER TABLE students ADD COLUMN linkedin TEXT, ADD COLUMN social_link TEXT;
--
-- CREATE TABLE IF NOT EXISTS users (
--     id VARCHAR(36) PRIMARY KEY,
--     email VARCHAR(255) UNIQUE NOT NULL,
--     password VARCHAR(255) NOT NULL,
--     name VARCHAR(255) NOT NULL,
--     role VARCHAR(50) NOT NULL DEFAULT 'admin',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
--
-- INSERT INTO users (id, email, password, name, role) VALUES
--     ('8b1a8d05-4f40-42cf-9a99-b1eb3ad79eb6', 'harshil2937patel@gmail.com', '$2y$10$D5giHm4mm6YKDsCWQyb.POoJ6dT5kXTcorbxiwS1FB6Mar1XWvUQ2', 'Harshil', 'admin'),
--     ('5c9e2b10-721d-4089-bb20-1a6125abc3f0', 'bhulkuanand36@gmail.com', '$2y$10$D5giHm4mm6YKDsCWQyb.POoJ6dT5kXTcorbxiwS1FB6Mar1XWvUQ2', 'Nand', 'admin')
-- ON DUPLICATE KEY UPDATE email=email;
-- ============================================================
