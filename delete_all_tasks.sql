-- Delete all tasks from the database
-- WARNING: This will permanently delete ALL tasks

-- Step 1: Check how many tasks exist before deleting
SELECT COUNT(*) as total_tasks FROM tasks;

-- Step 2: Delete all tasks
DELETE FROM tasks;

-- Step 3: Verify deletion
SELECT COUNT(*) as remaining_tasks FROM tasks;

-- Expected result: remaining_tasks should be 0
