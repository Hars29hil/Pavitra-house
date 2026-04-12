-- Create the student_results table
CREATE TABLE public.student_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    semester TEXT NOT NULL,
    sgpa TEXT NOT NULL,
    cgpa TEXT NOT NULL,
    backlogs INTEGER DEFAULT 0,
    exam_month_year TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;

-- Create basic policies (adjust as needed for your auth setup)
-- Allow read access to everyone (or authenticated users)
CREATE POLICY "Allow public read access" ON public.student_results
    FOR SELECT USING (true);

-- Allow insert/update/delete access to authenticated users (admin)
CREATE POLICY "Allow all access to authenticated users" ON public.student_results
    FOR ALL USING (auth.role() = 'authenticated');
