import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { StatCard } from '@/components/StatCard';
import { StudentListItem } from '@/components/StudentListItem';
import { StudentProfileSheet } from '@/components/StudentProfileSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStudents } from '@/lib/store';
import { Student } from '@/types';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Clock, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [showAlumni, setShowAlumni] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data || []);
    } catch (error) {
      console.error(error);
      setStudents([]);
    }
  };

  // Filter students based on state
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
    <div className="min-h-screen pb-20 relative animate-fade-in">
      <AppHeader title="HSH" />

      <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        <div className="space-y-6">
          {/* Main Content: Student List */}
          <div className="space-y-6">
            {/* Search and Actions Row - Fixed Layout */}
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <Input
                  placeholder="Search name, room, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-12 glass-card border-white/40 rounded-2xl focus:ring-primary/30 focus:border-primary transition-all text-base font-medium shadow-soft"
                />
              </div>

              {/* Toggle and Add Button Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
                {/* Toggle Buttons */}
                <div className="flex p-1 gap-1 glass-card rounded-2xl shadow-soft">
                  <button
                    onClick={() => setShowAlumni(false)}
                    className={cn(
                      "flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                      !showAlumni
                        ? "gradient-primary text-white shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                    )}
                  >
                    Current
                  </button>
                  <button
                    onClick={() => setShowAlumni(true)}
                    className={cn(
                      "flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap",
                      showAlumni
                        ? "gradient-primary text-white shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                    )}
                  >
                    Alumni
                  </button>
                </div>

                {/* Add Student Button */}
                <button
                  onClick={() => navigate('/students/add')}
                  className="h-12 sm:h-14 px-6 gradient-primary text-white rounded-2xl shadow-soft-lg flex items-center justify-center gap-2 hover:shadow-soft-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-bold text-sm shrink-0"
                  title="Add Student"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Student List */}
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-1">
              {filteredStudents.length > 0 ? (
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
                <div className="text-center py-20 glass-card border-dashed border-2 border-border/50 rounded-3xl animate-fade-in">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">No students found</h3>
                  <p className="text-muted-foreground mt-1">Try adjusting your search criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <StudentProfileSheet
        student={selectedStudent}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
