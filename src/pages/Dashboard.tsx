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
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { addTask } from '@/lib/store';
import { toast } from 'sonner';

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
  
  // Task state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchStudentsData = async () => {
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
      }
    };

    fetchStudentsData();

    const interval = setInterval(() => {
      fetchStudentsData();
    }, 5000); // Polling every 5 seconds for real-time updates

    return () => clearInterval(interval);
  }, [refetchTrigger]);

  const handleRefetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  const handleCreateTask = async (newTask: any) => {
    try {
      await addTask(newTask);
      toast.success("Task assigned successfully!");
    } catch (e) {
      toast.error("Failed to save task to database");
      throw e;
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
              onClick={() => navigate(`/students/add?alumni=${showAlumni}`)}
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
        onUpdate={handleRefetch}
      />

      {/* Floating Plus Task Button */}
      <Button
        className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl shadow-soft-lg bg-primary hover:bg-primary/90 hover:scale-[1.1] active:scale-[0.9] transition-all z-50 group"
        size="icon"
        onClick={() => setShowCreateDialog(true)}
      >
        <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
      </Button>

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onTaskCreate={handleCreateTask}
      />
    </div>
  );
};

export default Dashboard;
