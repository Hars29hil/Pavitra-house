import { supabase } from '@/lib/supabase';
import { Student, Task } from '@/types';

// --- Types ---

// Define Karyakarta locally or import if available. 
// Based on Categories.tsx, it has id, name, type, parentId, studentIds.
// We'll treat `categories` table as having a JSONB column `student_ids` or relation.
export interface Karyakarta {
    id: string;
    name: string;
    studentIds: string[];
    type: 'main' | 'sub';
    parentId?: string;
}

export interface EducationResource {
    id: string;
    title: string;
    type: 'video' | 'link';
    url: string;
    description?: string;
    created_at?: string;
}

// --- Helpers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromDbStudent = (db: any): Student => ({
    id: db.id,
    roomNo: db.room_no,
    name: db.name,
    age: db.age,
    dob: db.dob,
    mobile: db.mobile,
    email: db.email,
    degree: db.degree,
    year: db.year,
    result: db.result,
    interest: db.interest,
    isAlumni: db.is_alumni,
    createdAt: db.created_at,
    profileImage: db.profile_image,
    job: db.job,
    college: db.college,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDbStudent = (student: Partial<Student>) => {
    const db: any = { ...student };
    if (student.roomNo !== undefined) db.room_no = student.roomNo;
    if (student.isAlumni !== undefined) db.is_alumni = student.isAlumni;
    if (student.createdAt !== undefined) db.created_at = student.createdAt;
    if (student.profileImage !== undefined) db.profile_image = student.profileImage;

    delete db.roomNo;
    delete db.isAlumni;
    delete db.createdAt;
    delete db.profileImage;

    // Remove empty ID to allow auto-generation
    if (!db.id || db.id === '') {
        delete db.id;
    }

    return db;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromDbTask = (db: any): Task => ({
    id: db.id,
    title: db.title,
    dueDate: db.due_date,
    status: db.status,
    assignedTo: db.assigned_to,
    assignedToName: db.assigned_to_name,
    category: db.category,
    description: db.description,
    isPracticeQuestion: db.is_practice_question,
    questionContent: db.question_content,
});

const toDbTask = (task: Partial<Task>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = { ...task };
    if (task.dueDate !== undefined) db.due_date = task.dueDate;
    if (task.assignedTo !== undefined) db.assigned_to = task.assignedTo;
    if (task.assignedToName !== undefined) db.assigned_to_name = task.assignedToName;
    if (task.isPracticeQuestion !== undefined) db.is_practice_question = task.isPracticeQuestion;
    if (task.questionContent !== undefined) db.question_content = task.questionContent;

    delete db.dueDate;
    delete db.assignedTo;
    delete db.assignedToName;
    delete db.isPracticeQuestion;
    delete db.questionContent;
    return db;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromDbCategory = (db: any): Karyakarta => ({
    id: db.id,
    name: db.name,
    type: db.type,
    parentId: db.parent_id,
    studentIds: db.student_ids || [],
});

const toDbCategory = (cat: Partial<Karyakarta>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = { ...cat };
    if (cat.parentId !== undefined) db.parent_id = cat.parentId;
    if (cat.studentIds !== undefined) db.student_ids = cat.studentIds;

    delete db.parentId;
    delete db.studentIds;
    return db;
};

// --- Students ---

export const getStudents = async (): Promise<Student[]> => {
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*');

        if (error) {
            console.error('Error fetching students:', error);
            return [];
        }

        return (data || []).map(fromDbStudent);
    } catch (error) {
        console.error('Unexpected error fetching students:', error);
        return [];
    }
};

export const addStudent = async (student: Omit<Student, 'id' | 'createdAt'>) => {
    try {
        const dbPayload = toDbStudent(student);
        const { data, error } = await supabase
            .from('students')
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw error;
        return fromDbStudent(data);
    } catch (error) {
        console.error('Error adding student:', error);
        throw error;
    }
};

export const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
        const dbPayload = toDbStudent(updates);
        const { data, error } = await supabase
            .from('students')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return fromDbStudent(data);
    } catch (error) {
        console.error('Error updating student:', error);
        throw error;
    }
};

export const deleteStudent = async (id: string) => {
    try {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting student:', error);
        throw error;
    }
};

export const upsertStudents = async (students: Student[]) => {
    try {
        const dbPayloads = students.map(toDbStudent);
        const { data, error } = await supabase
            .from('students')
            .upsert(dbPayloads)
            .select();

        if (error) throw error;
        return (data || []).map(fromDbStudent);
    } catch (error) {
        console.error('Error upserting students:', error);
        throw error;
    }
};

// --- Tasks ---

export const getTasks = async (): Promise<Task[]> => {
    try {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(fromDbTask);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
};

export const addTask = async (task: Task) => {
    try {
        const dbPayload = toDbTask(task);
        const { data, error } = await supabase.from('tasks').insert([dbPayload]).select().single();
        if (error) throw error;
        return fromDbTask(data);
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
        const dbPayload = toDbTask(updates);
        const { data, error } = await supabase.from('tasks').update(dbPayload).eq('id', id).select().single();
        if (error) throw error;
        return fromDbTask(data);
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

export const deleteTask = async (id: string) => {
    try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

// --- Categories (Karyakartas) ---

export const getCategories = async (): Promise<Karyakarta[]> => {
    try {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) {
            // It might be possible the table doesn't exist yet, return empty to prevent crash
            console.warn('Error fetching categories (might check table exists):', error);
            return [];
        }
        return (data || []).map(fromDbCategory);
    } catch (error) {
        console.error('Unexpected error fetching categories:', error);
        return [];
    }
};

export const addCategory = async (cat: Karyakarta) => {
    try {
        const dbPayload = toDbCategory(cat);
        const { data, error } = await supabase.from('categories').insert([dbPayload]).select().single();
        if (error) throw error;
        return fromDbCategory(data);
    } catch (error) {
        console.error('Error adding category:', error);
        throw error;
    }
};

export const updateCategory = async (id: string, updates: Partial<Karyakarta>) => {
    try {
        const dbPayload = toDbCategory(updates);
        const { data, error } = await supabase.from('categories').update(dbPayload).eq('id', id).select().single();
        if (error) throw error;
        return fromDbCategory(data);
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
};

export const deleteCategory = async (id: string) => {
    try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

// Education Resources
export const getEducationResources = async () => {
    try {
        const { data, error } = await supabase
            .from('education_resources')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as EducationResource[];
    } catch (error) {
        console.error('Error fetching resources:', error);
        return [];
    }
};

export const addEducationResource = async (resource: Omit<EducationResource, 'id' | 'created_at'>) => {
    try {
        const { data, error } = await supabase
            .from('education_resources')
            .insert([resource])
            .select()
            .single();

        if (error) throw error;
        return data as EducationResource;
    } catch (error) {
        console.error('Error adding resource:', error);
        throw error;
    }
};

export const deleteEducationResource = async (id: string) => {
    try {
        const { error } = await supabase
            .from('education_resources')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting resource:', error);
        throw error;
    }
};

// --- Student Results ---

export interface StudentResult {
    id: string;
    studentId: string;
    semester: string;
    sgpa: string;
    cgpa: string;
    backlogs: number;
    examMonthYear: string;
    createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromDbResult = (db: any): StudentResult => ({
    id: db.id,
    studentId: db.student_id,
    semester: db.semester,
    sgpa: db.sgpa,
    cgpa: db.cgpa,
    backlogs: db.backlogs,
    examMonthYear: db.exam_month_year,
    createdAt: db.created_at,
});

const toDbResult = (result: Partial<StudentResult>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = { ...result };
    if (result.studentId !== undefined) db.student_id = result.studentId;
    if (result.examMonthYear !== undefined) db.exam_month_year = result.examMonthYear;

    delete db.studentId;
    delete db.examMonthYear;

    return db;
};

export const getStudentResults = async (studentId: string): Promise<StudentResult[]> => {
    try {
        const { data, error } = await supabase
            .from('student_results')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false }); // Latest first

        if (error) {
            console.warn('Error fetching results (check table):', error);
            return [];
        }
        return (data || []).map(fromDbResult);
    } catch (error) {
        console.error('Unexpected error fetching results:', error);
        return [];
    }
};

export const addStudentResult = async (result: Omit<StudentResult, 'id' | 'createdAt'>) => {
    try {
        const dbPayload = toDbResult(result);
        const { data, error } = await supabase
            .from('student_results')
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw error;
        return fromDbResult(data);
    } catch (error) {
        console.error('Error adding result:', error);
        throw error;
    }
};

export const deleteStudentResult = async (id: string) => {
    try {
        const { error } = await supabase.from('student_results').delete().eq('id', id);
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting result:', error);
        throw error;
    }
};

// Settings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSetting = async (key: string) => {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

    if (error) return null;
    return data?.value;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
        .from('settings')
        .upsert({ key, value });

    if (error) throw error;
};
