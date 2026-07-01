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
import { getStudents, deleteStudent, upsertStudents, getAllStudentResults } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/contexts/ConfirmationContext';
import { Sparkles, Loader2 } from 'lucide-react';

const Update = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);

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
    const isConfirmed = await confirm({
      title: "Delete Student?",
      message: "Are you sure you want to delete this student record? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (isConfirmed) {
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
      const toastId = toast.loading('Updating database... this may take a moment.');
      await upsertStudents(updatedStudents);
      await fetchStudents(); 
      setActiveTab('single');
      toast.success('Database updated successfully. Switched to view mode.', { id: toastId });
    } catch (error) {
      toast.error('Failed to update database');
    }
  };

  const handleCleanDuplicates = async () => {
    const isConfirmed = await confirm({
      title: "Clean Duplicates?",
      message: "This will scan for duplicate students (same name and room number) and remove the empty ones, keeping the one with result history. This action cannot be undone.",
      confirmText: "Clean Now",
      cancelText: "Cancel",
      variant: "destructive"
    });

    if (!isConfirmed) return;

    try {
      setIsCleaning(true);
      const toastId = toast.loading('Analyzing duplicates...');
      
      // 1. Fetch all results to know who has results
      const allResults = await getAllStudentResults();
      const studentsWithResults = new Set(allResults.map(r => r.studentId));

      // 2. Group students by name + roomNo
      const groups = new Map<string, Student[]>();
      for (const s of students) {
        // use mobile as fallback if name is somehow missing
        const key = `${s.name?.trim().toLowerCase() || s.mobile}-${s.roomNo?.trim().toLowerCase()}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(s);
      }

      // 3. Find duplicates
      const toDelete: string[] = [];
      
      for (const group of groups.values()) {
        if (group.length > 1) {
          // Sort them so the "best" one is first
          group.sort((a, b) => {
            const aHasResult = studentsWithResults.has(a.id) ? 1 : 0;
            const bHasResult = studentsWithResults.has(b.id) ? 1 : 0;
            if (aHasResult !== bHasResult) {
               return bHasResult - aHasResult; // descending
            }
            
            // If neither has results (or both have), keep the one with a profileImage or mobile
            const aScore = (a.mobile ? 1 : 0) + (a.profileImage ? 1 : 0) + (a.email ? 1 : 0);
            const bScore = (b.mobile ? 1 : 0) + (b.profileImage ? 1 : 0) + (b.email ? 1 : 0);
            if (aScore !== bScore) {
               return bScore - aScore;
            }
            // fallback to createdAt
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          });
          
          // The first one is kept, the rest are marked for deletion
          for (let i = 1; i < group.length; i++) {
            toDelete.push(group[i].id);
          }
        }
      }

      if (toDelete.length === 0) {
        toast.success('No duplicates found!', { id: toastId });
        setIsCleaning(false);
        return;
      }

      toast.loading(`Found ${toDelete.length} duplicates. Deleting carefully to avoid server overload...`, { id: toastId });

      // 4. Delete sequentially with delay
      let deletedCount = 0;
      for (const id of toDelete) {
        try {
          await deleteStudent(id);
          deletedCount++;
          if (deletedCount % 5 === 0) {
             toast.loading(`Deleted ${deletedCount} of ${toDelete.length}...`, { id: toastId });
          }
          await new Promise(r => setTimeout(r, 200)); // 200ms delay to avoid 500 error
        } catch(e) {
          console.error("Failed to delete", id, e);
        }
      }

      await fetchStudents();
      toast.success(`Successfully removed ${deletedCount} duplicate records!`, { id: toastId });
    } catch (error) {
      toast.error('An error occurred while cleaning duplicates');
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Database className="w-8 h-8 text-primary" />
              Update
            </h2>
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Update or remove hostel records</p>
          </div>
          
          <Button 
            onClick={handleCleanDuplicates}
            disabled={isCleaning}
            variant="outline"
            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 shadow-sm"
          >
            {isCleaning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Clean Duplicates
          </Button>
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
                Current
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
