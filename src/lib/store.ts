import api, { API_BASE_URL } from '@/lib/api';
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
const formatDateForDb = (dateStr: string | undefined | null) => {
    if (!dateStr || typeof dateStr !== 'string') return dateStr;
    
    // Check if it matches DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = dateStr.trim().match(ddmmyyyyRegex);
    
    if (match) {
        const [, day, month, year] = match;
        // Pad day and month with leading zeros (e.g. 1 -> 01)
        const paddedDay = day.padStart(2, '0');
        const paddedMonth = month.padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    return dateStr;
};


const resolveProfileImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    
    // If it's a relative path, prefix it with the API base URL
    if (url.startsWith('/api/uploads/') || url.startsWith('api/uploads/')) {
        const cleanPath = url.startsWith('/') ? url : '/' + url;
        return `${API_BASE_URL}${cleanPath}`;
    }
    
    // If it's an absolute URL pointing to localhost, redirect it to the production API URL
    if (url.includes('localhost:') && (url.includes('/api/uploads/') || url.includes('/uploads/'))) {
        const pathStart = url.indexOf('/api/uploads/');
        if (pathStart !== -1) {
            return `${API_BASE_URL}${url.substring(pathStart)}`;
        }
        const uploadsStart = url.indexOf('/uploads/');
        if (uploadsStart !== -1) {
            return `${API_BASE_URL}/api${url.substring(uploadsStart)}`;
        }
    }
    return url;
};

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
    profileImage: resolveProfileImageUrl(db.profile_image),
    job: db.job,
    college: db.college,
    linkedin: db.linkedin,
    socialLink: db.social_link,
    countryCode: db.country_code,
    designation: db.designation,
    jobPlace: db.job_place,
    livingPlace: db.living_place,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toDbStudent = (student: Partial<Student>) => {
    const db: any = { ...student };
    if (student.roomNo !== undefined) db.room_no = student.roomNo;
    if (student.isAlumni !== undefined) db.is_alumni = student.isAlumni;
    if (student.createdAt !== undefined) db.created_at = student.createdAt;
    if (student.profileImage !== undefined) db.profile_image = student.profileImage;
    if (student.dob !== undefined) db.dob = formatDateForDb(student.dob);
    if (student.socialLink !== undefined) db.social_link = student.socialLink;
    if (student.countryCode !== undefined) db.country_code = student.countryCode;
    if (student.designation !== undefined) db.designation = student.designation;
    if (student.jobPlace !== undefined) db.job_place = student.jobPlace;
    if (student.livingPlace !== undefined) db.living_place = student.livingPlace;

    delete db.roomNo;
    delete db.isAlumni;
    delete db.createdAt;
    delete db.profileImage;
    delete db.socialLink;
    delete db.countryCode;
    delete db.jobPlace;
    delete db.livingPlace;

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
    if (task.dueDate !== undefined) db.due_date = formatDateForDb(task.dueDate);
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
        const res = await api.get<any[]>('/api/students');
        return (res.data || []).map(fromDbStudent);
    } catch (error) {
        console.error('Unexpected error fetching students:', error);
        return [];
    }
};

export const getStudentByMobile = async (mobile: string): Promise<Student | null> => {
    try {
        // Fallback: Fetch all students and filter locally since the Hostinger backend
        // might not have the updated `students.php` with the mobile filter yet.
        const res = await api.get<any[]>('/api/students');
        if (res.data && Array.isArray(res.data)) {
            const allStudents = res.data.map(fromDbStudent);
            // Trim the mobile numbers because some database entries have leading spaces (e.g., " 9725714912")
            const student = allStudents.find(s => s.mobile?.trim() === mobile.trim());
            return student || null;
        }
        return null;
    } catch (error) {
        console.error('Error fetching student by mobile:', error);
        return null;
    }
};

export const addStudent = async (student: Omit<Student, 'id' | 'createdAt'>) => {
    try {
        const dbPayload = toDbStudent(student);
        const res = await api.post<any>('/api/students', dbPayload);
        return fromDbStudent(res.data);
    } catch (error) {
        console.error('Error adding student:', error);
        throw error;
    }
};

export const updateStudent = async (id: string, updates: Partial<Student>) => {
    try {
        const dbPayload = toDbStudent(updates);
        const res = await api.put<any>(`/api/students/${id}`, dbPayload);
        return fromDbStudent(res.data);
    } catch (error) {
        console.error('Error updating student:', error);
        throw error;
    }
};

export const deleteStudent = async (id: string) => {
    try {
        await api.delete(`/api/students/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting student:', error);
        throw error;
    }
};

export const upsertStudents = async (students: Student[]) => {
    try {
        const dbPayloads = students.map(toDbStudent);
        const res = await api.post<any[]>('/api/students/upsert', dbPayloads);
        return (res.data || []).map(fromDbStudent);
    } catch (error) {
        console.error('Error upserting students:', error);
        throw error;
    }
};

// --- Tasks ---

export const getTasks = async (): Promise<Task[]> => {
    try {
        const res = await api.get<any[]>('/api/tasks');
        return (res.data || []).map(fromDbTask);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
};

export const addTask = async (task: Task) => {
    try {
        const dbPayload = toDbTask(task);
        const res = await api.post<any>('/api/tasks', dbPayload);
        return fromDbTask(res.data);
    } catch (error) {
        console.error('Error adding task:', error);
        throw error;
    }
};

export const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
        const dbPayload = toDbTask(updates);
        const res = await api.put<any>(`/api/tasks/${id}`, dbPayload);
        return fromDbTask(res.data);
    } catch (error) {
        console.error('Error updating task:', error);
        throw error;
    }
};

export const deleteTask = async (id: string) => {
    try {
        await api.delete(`/api/tasks/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
};

// --- Categories (Karyakartas) ---

export const getCategories = async (): Promise<Karyakarta[]> => {
    try {
        const res = await api.get<any[]>('/api/categories');
        return (res.data || []).map(fromDbCategory);
    } catch (error) {
        console.error('Unexpected error fetching categories:', error);
        return [];
    }
};

export const addCategory = async (cat: Karyakarta) => {
    try {
        const dbPayload = toDbCategory(cat);
        const res = await api.post<any>('/api/categories', dbPayload);
        return fromDbCategory(res.data);
    } catch (error) {
        console.error('Error adding category:', error);
        throw error;
    }
};

export const updateCategory = async (id: string, updates: Partial<Karyakarta>) => {
    try {
        const dbPayload = toDbCategory(updates);
        const res = await api.put<any>(`/api/categories/${id}`, dbPayload);
        return fromDbCategory(res.data);
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
};

export const deleteCategory = async (id: string) => {
    try {
        await api.delete(`/api/categories/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
};

// Education Resources
export const getEducationResources = async () => {
    try {
        const res = await api.get<EducationResource[]>('/api/education_resources');
        return res.data || [];
    } catch (error) {
        console.error('Error fetching resources:', error);
        return [];
    }
};

export const addEducationResource = async (resource: Omit<EducationResource, 'id' | 'created_at'>) => {
    try {
        const res = await api.post<EducationResource>('/api/education_resources', resource);
        return res.data;
    } catch (error) {
        console.error('Error adding resource:', error);
        throw error;
    }
};

export const deleteEducationResource = async (id: string) => {
    try {
        await api.delete(`/api/education_resources/${id}`);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getStudentResults = async (studentId: string): Promise<StudentResult[]> => {
    try {
        const res = await api.get<any[]>(`/api/student_results?student_id=${studentId}`);
        return (res.data || []).map(fromDbResult);
    } catch (error) {
        console.error('Unexpected error fetching results:', error);
        return [];
    }
};

export const addStudentResult = async (result: Omit<StudentResult, 'id' | 'createdAt'>) => {
    try {
        const dbPayload = toDbResult(result);
        const res = await api.post<any>('/api/student_results', dbPayload);
        return fromDbResult(res.data);
    } catch (error) {
        console.error('Error adding result:', error);
        throw error;
    }
};

export const deleteStudentResult = async (id: string) => {
    try {
        await api.delete(`/api/student_results/${id}`);
        return true;
    } catch (error) {
        console.error('Error deleting result:', error);
        throw error;
    }
};

// Settings
export const getSetting = async (key: string) => {
    try {
        const res = await api.get<any>(`/api/settings?key=${key}`);
        return res.data && res.data.success ? res.data.value : null;
    } catch (error) {
        console.error('Error getting setting:', error);
        return null;
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const updateSetting = async (key: string, value: any) => {
    try {
        await api.post('/api/settings', { key, value });
    } catch (error) {
        console.error('Error updating setting:', error);
        throw error;
    }
};

