export interface Student {
  id: string;
  roomNo: string;
  name: string;
  age: number;
  dob: string;
  mobile: string;
  email: string;
  degree: string;
  year: string;
  result: string;
  interest: string;
  isAlumni: boolean;
  createdAt: string;
  profileImage?: string;
  job?: string; // For alumni (or internships)
  college?: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'done';
  assignedTo?: string; // Student ID
  assignedToName?: string;
  category?: string;
  description?: string;
  isPracticeQuestion?: boolean;
  questionContent?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'room' | 'fee' | 'task';
  description?: string;
}

export interface RoomCategory {
  id: string;
  name: string;
  capacity: number;
  price: number;
}

export interface Activity {
  id: string;
  type: 'student_added' | 'student_updated' | 'task_created' | 'room_updated';
  description: string;
  timestamp: string;
}

export interface EducationResource {
  id: string;
  title: string;
  type: 'video' | 'link';
  url: string;
  description?: string;
  created_at?: string;
}

export interface StudentResult {
  id: string;
  studentId: string;
  semester: string;
  sgpa: string; // Storing as string to handle "9.5" or "A+" flexibly, or use number if strict
  cgpa: string;
  backlogs: number;
  examMonthYear: string;
  createdAt: string;
}
