import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserMinus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';
import { StudentProfile } from '@/components/StudentProfile';

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | undefined>(undefined);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const students = await getStudents();
        const found = students.find(s => s.id === id);
        setStudent(found);
      } catch (error) {
        console.error(error);
        setStudent(undefined);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);



  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
            <UserMinus className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold">Student not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background pb-20 relative animate-fade-in"
    >
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border shadow-soft">
        <div className="flex items-center gap-4 h-16 px-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-primary -ml-2"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Student Profile</h1>
        </div>
      </header>

      <main className="px-4 md:px-6 pb-8 space-y-6 max-w-4xl mx-auto mt-4">
        <StudentProfile student={student} />
      </main>
    </div>
  );
};

export default StudentDetails;
