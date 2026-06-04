ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be restrictive
DROP POLICY IF EXISTS "Allow public read access" ON public.student_results;
DROP POLICY IF EXISTS "Allow all access to authenticated users" ON public.student_results;
DROP POLICY IF EXISTS "Enable read/write for all" ON public.student_results;

-- Create an open policy similar to other tables (categories, tasks, etc.)
CREATE POLICY "Enable read/write for all" ON public.student_results 
FOR ALL USING (true) WITH CHECK (true);
