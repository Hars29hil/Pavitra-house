import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Edit, UserX, Database } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Student } from '@/types';
import { StudentListItem } from '@/components/StudentListItem';
import { BulkUpdate } from '@/components/BulkUpdate';
import { toast } from 'sonner';
import { getStudents, deleteStudent, upsertStudents } from '@/lib/store';
import { cn } from '@/lib/utils';

const Update = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);

  const [showAlumni, setShowAlumni] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredStudents = students.filter(student => {
    // 1. Filter by Current/Alumni
    const matchesType = showAlumni ? student.isAlumni : !student.isAlumni;
    if (!matchesType) return false;

    // 2. Filter by Search
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.name?.toLowerCase().includes(query) ||
      student.id?.toLowerCase().includes(query) ||
      student.roomNo?.toLowerCase().includes(query) ||
      student.mobile?.includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteStudent(id);
        const updatedList = students.filter(s => s.id !== id);
        setStudents(updatedList);
        toast.success('Student deleted successfully');
      } catch (error) {
        toast.error('Failed to delete student');
      }
    }
  };

  const handleUpdate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/students/${id}/edit`);
  };

  const handleBulkUpdate = async (updatedStudents: Student[]) => {
    try {
      await upsertStudents(updatedStudents);
      setStudents(updatedStudents); // Ideally fetch fresh
      setActiveTab('single');
      toast.success('List updated. Switched to view mode.');
    } catch (error) {
      toast.error('Failed to bulk update');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Database className="w-8 h-8 text-primary" />
            Update
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Update or remove hostel records</p>
        </div>

        <Tabs defaultValue="single" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative group mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by ID, name or room..."
              className="pl-12 h-14 bg-white border-border/50 rounded-2xl shadow-soft focus:ring-primary/20 focus:border-primary transition-all text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <TabsList className="flex p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm w-full mb-8">
            <TabsTrigger value="single" className="flex-1 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft">Manage</TabsTrigger>
            <TabsTrigger value="bulk" className="flex-1 py-3 rounded-xl text-sm font-bold data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-6">

            {/* Toggle Current / Alumni */}
            <div className="flex p-1 bg-muted/50 rounded-xl border border-border/50 max-w-sm mx-auto mb-6">
              <button
                onClick={() => setShowAlumni(false)}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  !showAlumni
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Current Students
              </button>
              <button
                onClick={() => setShowAlumni(true)}
                className={cn(
                  "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                  showAlumni
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Alumni
              </button>
            </div>

            <div className="space-y-4">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="relative group animate-slide-in"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <StudentListItem
                      student={student}
                      onClick={() => navigate(`/students/${student.id}`)}
                      hideContactActions={true}
                    />
                    {/* Action Overlay */}
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 flex gap-2 transition-all duration-300">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-10 w-10 p-0 rounded-xl font-bold shadow-soft"
                        onClick={(e) => handleDelete(student.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 bg-white/50 border border-dashed border-border rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center">
                    <UserX className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">No students found</h3>
                    <p className="text-muted-foreground mt-1">Try a different search query or switch tabs</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bulk" className="animate-fade-in">
            <div className="bg-white border border-border/50 rounded-3xl shadow-soft p-6">
              <BulkUpdate students={students} onUpdate={handleBulkUpdate} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Update;
