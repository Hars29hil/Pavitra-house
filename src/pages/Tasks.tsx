import { useState, useEffect, useMemo } from 'react';
import { Plus, ClipboardList, Search, Users, CheckSquare } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { TaskItem } from '@/components/TaskItem';
import { Button } from '@/components/ui/button';
import { Task, Student } from '@/types';
import { Input } from '@/components/ui/input';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { CreateYuvakTaskDialog } from '@/components/CreateYuvakTaskDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { getTasks, addTask, updateTask, deleteTask, getStudents, getCategories, Karyakarta } from '@/lib/store';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmationContext';
const Tasks = () => {
  const { confirm } = useConfirm();
  const { adminName, adminRole } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Karyakarta[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [showYuvakDialog, setShowYuvakDialog] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Fetch Tasks from DB and setup polling
  useEffect(() => {
    const fetchTasks = async (isInitial = false) => {
      console.log(`[Tasks.tsx] fetchTasks started (isInitial: ${isInitial})`);
      if (isInitial) setLoading(true);
      try {
        console.log(`[Tasks.tsx] Triggering Promise.all for tasks, students, categories...`);
        const [tasksData, studentsData, categoriesData] = await Promise.all([
          getTasks(),
          getStudents(),
          getCategories()
        ]);
        console.log(`[Tasks.tsx] Promise.all completed successfully!`, {
          tasksDataCount: tasksData?.length,
          studentsDataCount: studentsData?.length,
          categoriesDataCount: categoriesData?.length
        });
        setTasks(tasksData || []);
        setStudents(studentsData || []);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("[Tasks.tsx] Error in fetchTasks:", error);
        if (isInitial) {
          setTasks([]);
          setStudents([]);
          setCategories([]);
        }
      } finally {
        console.log(`[Tasks.tsx] fetchTasks finally block reached (isInitial: ${isInitial})`);
        if (isInitial) {
          setLoading(false);
          console.log(`[Tasks.tsx] setLoading(false) called`);
        }
      }
    };

    fetchTasks(true);

    const interval = setInterval(() => {
      fetchTasks(false);
    }, 5000); // Polling every 5 seconds for real-time updates

    return () => clearInterval(interval);
  }, [refetchTrigger]);

  const myCategory = useMemo(() => {
    return categories.find(
      c => c.name.trim().toLowerCase() === adminName.trim().toLowerCase()
    );
  }, [categories, adminName]);

  const assignedStudentIds = useMemo(() => {
    if (adminRole === 'admin') return null;
    if (!myCategory) return [];

    let assignedIds = new Set<string>(myCategory.studentIds || []);
    if (myCategory.type === 'main') {
      const subs = categories.filter(c => c.parentId === myCategory.id);
      subs.forEach(sub => {
        (sub.studentIds || []).forEach(id => assignedIds.add(id));
      });
    }
    return Array.from(assignedIds);
  }, [categories, myCategory, adminRole]);

  // Notifications for Deadlines
  useTaskNotifications(tasks);

  const toggleTask = async (taskId: string) => {
    // Optimistic UI Update
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.createdBy && task.createdBy.trim().toLowerCase() !== adminName.trim().toLowerCase()) {
      toast.error(`Only the creator (${task.createdBy}) can mark this task as complete`);
      return;
    }

    const newStatus = task.status === 'pending' ? 'done' : 'pending';

    // Update Local State
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    );

    // Update DB
    try {
      await updateTask(taskId, { status: newStatus });
    } catch (e) {
      // Revert on error
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, status: task.status } : t)
      );
      toast.error("Failed to update task status");
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'all' ? true : task.status === filter;
    const matchesSearch = (task.title || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (adminRole !== 'admin') {
      if (!task.assignedTo || !assignedStudentIds) return false;

      const taskStudentIds = task.assignedTo.split(',').map(id => id.trim());
      const hasAssignedStudent = taskStudentIds.some(id => assignedStudentIds.includes(id));
      if (!hasAssignedStudent) return false;

      // Filter out tasks that should not be visible to Karyakarta
      if (task.showToKaryakarta === false) return false;
    }

    return matchesFilter && matchesSearch;
  });

  const handleCreateTask = async (newTask: Task) => {
    try {
      const savedTask = await addTask(newTask);
      if (savedTask) {
        setTasks(prev => [savedTask, ...prev]);
      }
      return savedTask;
    } catch (e) {
      toast.error("Failed to save task to database");
      throw e;
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updated = await updateTask(id, updates);
      if (updated) {
        setTasks(prev => prev.map(t => t.id === id ? updated : t));
        toast.success("Task updated successfully");
      }
    } catch (e) {
      toast.error("Failed to update task");
      throw e;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Confirm deletion
    const isConfirmed = await confirm({
      title: "Delete Task?",
      message: "Are you sure you want to delete this task? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive"
    });
    if (!isConfirmed) {
      return;
    }

    // Optimistic UI update
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      await deleteTask(taskId);
      toast.success('Task deleted successfully');
    } catch (error) {
      // Revert on error
      if (taskToDelete) {
        setTasks(prev => [taskToDelete, ...prev]);
      }
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative animate-fade-in">
      <AppHeader title="Hari-Saurabh Hostel" />

      <main className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Tasks
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Stay on top of your responsibilities</p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-white border-border/50 rounded-2xl shadow-soft focus:ring-primary/20 focus:border-primary transition-all text-base w-full"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex w-full md:w-auto p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm md:ml-auto">
            {(['all', 'pending', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 capitalize",
                  filter === f
                    ? "bg-primary text-white shadow-soft"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-20">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground col-span-full">Loading tasks...</div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map((task, index) => (
              <div
                key={task.id}
                className="animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskItem
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onEdit={() => {
                    setTaskToEdit(task);
                    setShowCreateDialog(true);
                  }}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/50 border border-dashed border-border rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-3 col-span-full">
              <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">No tasks found</h3>
                <p className="text-muted-foreground mt-1">Try switching filters or add a new task</p>
              </div>
            </div>
          )}
        </div>

        <Button
          className="fixed bottom-8 right-8 w-16 h-16 rounded-2xl shadow-soft-lg bg-primary hover:bg-primary/90 hover:scale-[1.1] active:scale-[0.9] transition-all z-50 group"
          size="icon"
          onClick={() => {
            setTaskToEdit(null);
            if (adminRole === 'admin') {
              setShowCreateDialog(true);
            } else {
              setShowTypeSelection(true);
            }
          }}
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
        </Button>

        <Dialog open={showTypeSelection} onOpenChange={setShowTypeSelection}>
          <DialogContent className="sm:max-w-sm rounded-3xl p-6 border-none bg-white">
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl font-black text-foreground">Choose Task Type</DialogTitle>
              <DialogDescription>
                Select what kind of task you want to create.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 pt-4">
              <Button
                onClick={() => {
                  setShowTypeSelection(false);
                  setShowYuvakDialog(true);
                }}
                className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-primary text-white hover:bg-primary/95 text-base font-black shadow-md border-none"
              >
                <Users className="w-6 h-6" />
                Yuvak Meet
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowTypeSelection(false);
                  setShowCreateDialog(true);
                }}
                className="h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 hover:bg-muted text-base font-black border border-border/60 text-foreground"
              >
                <CheckSquare className="w-6 h-6 text-primary" />
                Assign Other Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CreateTaskDialog
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open);
            if (!open) {
              setTaskToEdit(null);
            }
          }}
          onTaskCreate={handleCreateTask}
          taskToEdit={taskToEdit}
          onTaskUpdate={handleUpdateTask}
        />

        <CreateYuvakTaskDialog
          open={showYuvakDialog}
          onOpenChange={setShowYuvakDialog}
          onTaskCreate={handleCreateTask}
          tasks={tasks}
        />
      </main>
    </div>
  );
};

export default Tasks;

