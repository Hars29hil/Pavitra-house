import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { StatCard } from '@/components/StatCard';
import { StudentListItem } from '@/components/StudentListItem';
import { StudentProfileSheet } from '@/components/StudentProfileSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getStudents, getSetting } from '@/lib/store';
import { Student } from '@/types';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import KaryakartaDashboard from './KaryakartaDashboard';

const Dashboard = () => {
  const { adminRole } = useAuth();
  
  if (adminRole === 'Karyakarta' || adminRole === 'Sub-Karyakarta') {
    return <KaryakartaDashboard />;
  }

  const navigate = useNavigate();
  const [showAlumni, setShowAlumni] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tagsData, setTagsData] = useState<{ tags: any[], assignments: Record<string, string> }>({ tags: [], assignments: {} });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data || []);
      
      const tagsSetting = await getSetting('student_tags');
      if (tagsSetting) {
        try {
          setTagsData(JSON.parse(tagsSetting));
        } catch (e) {
          console.error('Error parsing student_tags setting:', e);
        }
      }
    } catch (error) {
      console.error(error);
      setStudents([]);
    }
  };

  const getStudentTags = (studentId: string) => {
    const val = tagsData.assignments[studentId];
    if (!val) return [];
    const ids = val.split(',').filter(Boolean);
    return ids
      .map(id => tagsData.tags.find(t => t.id === id))
      .filter((t): t is any => !!t);
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
  }).sort((a, b) => {
    const roomA = a.roomNo || '';
    const roomB = b.roomNo || '';
    return roomA.localeCompare(roomB, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="min-h-screen pb-20 relative animate-fade-in">
      <AppHeader title="HSH" />

      <main className="w-full max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Top Controls: Search, Toggle, Add */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, room, mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 pl-10 rounded-xl text-sm shadow-sm w-full"
            />
          </div>

          {/* Toggle + Add */}
          <div className="flex w-full md:w-auto items-center gap-3">
            {/* Toggle */}
            <div className="flex flex-1 md:flex-none p-1 bg-gray-100 rounded-xl md:w-48">
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
              className="h-11 px-4 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap shrink-0 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Yuvak</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Student List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student, index) => (
              <div
                key={student.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <StudentListItem
                  student={student}
                  tags={getStudentTags(student.id)}
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
              <p className="text-sm text-gray-500">No Yuvaks found</p>
            </div>
          )}
        </div>

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

export default Dashboard;
