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

      <main className="w-full max-w-md mx-auto px-3 py-4 space-y-5">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search name, room, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 pl-10 rounded-xl text-sm shadow-sm"
          />
        </div>

        {/* Toggle + Add */}
        <div className="flex flex-col gap-3">

          {/* Toggle */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setShowAlumni(false)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg transition",
                !showAlumni
                  ? "bg-blue-600 text-white"
                  : "text-gray-500"
              )}
            >
              Current
            </button>

            <button
              onClick={() => setShowAlumni(true)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg transition",
                showAlumni
                  ? "bg-blue-600 text-white"
                  : "text-gray-500"
              )}
            >
              Alumni
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => navigate('/students/add')}
            className="h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>

        </div>

        {/* Student List */}
        <div className="space-y-3">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student, index) => (
              <div
                key={student.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
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
            <div className="text-center py-12">
              <Search className="w-6 h-6 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No students found</p>
            </div>
          )}
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
