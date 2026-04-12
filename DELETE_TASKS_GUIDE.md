# 🗑️ Delete All Tasks - Quick Guide

## How to Delete All Tasks

You can delete all tasks from the database using the SQL script.

---

## 🚀 Quick Method (Supabase Dashboard)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run This SQL

```sql
-- Delete all tasks
DELETE FROM tasks;
```

### Step 3: Click "Run"

You should see: **"Success. X rows affected"** (where X is the number of tasks deleted)

---

## 📊 Check Before Deleting (Optional)

If you want to see how many tasks will be deleted first:

```sql
-- Check total tasks
SELECT COUNT(*) as total_tasks FROM tasks;
```

---

## ✅ Verify Deletion

After deleting, verify all tasks are gone:

```sql
-- Should return 0
SELECT COUNT(*) as remaining_tasks FROM tasks;
```

---

## 🎯 Alternative: Delete Specific Tasks

### Delete Tasks for a Specific Student

```sql
-- Replace 'STUDENT_ID' with actual student ID
DELETE FROM tasks 
WHERE assigned_to = 'STUDENT_ID';
```

### Delete Tasks by Status

```sql
-- Delete only pending tasks
DELETE FROM tasks 
WHERE status = 'pending';

-- Delete only completed tasks
DELETE FROM tasks 
WHERE status = 'completed';
```

### Delete Tasks by Date

```sql
-- Delete tasks older than a specific date
DELETE FROM tasks 
WHERE due_date < '2026-01-01';

-- Delete tasks created before a date
DELETE FROM tasks 
WHERE created_at < '2026-01-01';
```

---

## 📱 Using the App (UI Method)

If you prefer using the UI:

1. Go to **Tasks** page
2. For each task:
   - Click the **delete icon** (trash)
   - Confirm deletion
3. Repeat for all tasks

**Note:** This is slower for many tasks. SQL is faster for bulk deletion.

---

## ⚠️ Important Notes

### Before Deleting:
- ✅ Make sure you want to delete ALL tasks
- ✅ This action cannot be undone
- ✅ Students will no longer see these tasks
- ✅ Task history will be lost

### After Deleting:
- ✅ Refresh your app to see changes
- ✅ Task list will be empty
- ✅ You can create new tasks anytime

---

## 🔄 Refresh the App

After deleting tasks in the database:

1. Go to your app
2. Press **Ctrl+R** (or **Cmd+R** on Mac)
3. Or hard refresh: **Ctrl+Shift+R**
4. Task list should now be empty

---

## 📝 SQL Script File

I've created a file called **`delete_all_tasks.sql`** in your project.

You can:
1. Open the file
2. Copy the SQL
3. Paste in Supabase SQL Editor
4. Run it

---

## 🎯 Quick Steps Summary

1. **Open Supabase** → SQL Editor
2. **Run:** `DELETE FROM tasks;`
3. **Refresh** your app
4. **Done!** All tasks deleted

---

**Simple and fast! All tasks will be removed from the database.** 🗑️
