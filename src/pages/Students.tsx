import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users2, RefreshCw } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { StudentListItem } from '@/components/StudentListItem';
import { StudentProfileSheet } from '@/components/StudentProfileSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/components/ui/select"
import { getStudents, updateStudent } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Student } from '@/types';
import { cn } from '@/lib/utils';

const Students = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlumni, setShowAlumni] = useState(false);
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await getStudents();
      setStudents(data || []);
    } catch (error) {
      console.error('Failed to fetch students', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roomNo?.includes(searchQuery) ||
      student.mobile?.includes(searchQuery) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = showAlumni ? student.isAlumni : !student.isAlumni;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users2 className="w-8 h-8 text-primary" />
            Student Directory
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Browse and search for any resident</p>
        </div>

        {/* Search & Toggle Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
              <Input
                placeholder="Search name, room, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 glass-card border-white/40 rounded-2xl focus:ring-primary/30 focus:border-primary transition-all text-base font-medium shadow-soft"
              />
            </div>



            <div className="flex w-full sm:w-auto p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
              <button
                onClick={() => setShowAlumni(false)}
                className={cn(
                  "flex-1 sm:flex-none px-3 sm:px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                  !showAlumni
                    ? "bg-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                Current ({students.filter(s => !s.isAlumni).length})
              </button>
              <button
                onClick={() => setShowAlumni(true)}
                className={cn(
                  "flex-1 sm:flex-none px-3 sm:px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                  showAlumni
                    ? "bg-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                Alumni ({students.filter(s => s.isAlumni).length})
              </button>
            </div>


          </div>

          {/* Student List */}
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 mb-20">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Updating Directory...</p>
              </div>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => (
                <div
                  key={student.id}
                  className="animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <StudentListItem
                    student={student}
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsProfileOpen(true);
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-20 bg-white/50 border border-dashed border-border rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground">No records found</h3>
                <p className="text-muted-foreground mt-1">Try refining your search terms</p>
              </div>
            )}
          </div>
        </section>

        {/* FAB */}
        <Button
          onClick={() => navigate('/students/add')}
          className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl shadow-soft-lg bg-primary hover:bg-primary/90 hover:scale-[1.1] active:scale-[0.9] transition-all z-50 group"
          size="icon"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
        </Button>
      </main>

      <StudentProfileSheet
        student={selectedStudent}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={fetchStudents}
      />
    </div>
  );
};

export default Students;
