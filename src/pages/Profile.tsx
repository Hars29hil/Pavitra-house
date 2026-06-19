import { useState, useEffect } from 'react';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';
import { StudentProfile } from '@/components/StudentProfile';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/AppHeader';

export default function Profile() {
  const { studentId } = useAuth();
  const [student, setStudent] = useState<Student | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const students = await getStudents();
        const found = students.find(s => s.id === studentId);
        setStudent(found);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) {
      fetchStudent();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="My Profile" />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center space-y-4">
          <h1 className="text-2xl font-bold text-muted-foreground">Profile not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="My Profile" />
      <main className="px-4 md:px-6 pb-8 space-y-6 max-w-4xl mx-auto mt-6">
        <StudentProfile student={student} hideEditAction={true} />
      </main>
    </div>
  );
}
