import { useState, useEffect } from 'react';
import { Plus, ClipboardList, Search } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { TaskItem } from '@/components/TaskItem';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';
import { Input } from '@/components/ui/input';
import { CreateTaskDialog } from '@/components/CreateTaskDialog';
import { cn } from '@/lib/utils';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { getTasks, addTask, updateTask, deleteTask } from '@/lib/store';
import { toast } from 'sonner';

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch Tasks from DB
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const data = await getTasks();
        setTasks(data || []);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  // Notifications for Deadlines
  useTaskNotifications(tasks);

  const toggleTask = async (taskId: string) => {
    // Optimistic UI Update
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

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
    return matchesFilter && matchesSearch;
  });

  const handleCreateTask = async (newTask: Task) => {
    try {
      const savedTask = await addTask(newTask);
      if (savedTask) {
        setTasks(prev => [savedTask, ...prev]);
      }
    } catch (e) {
      toast.error("Failed to save task to database");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
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

      <main className="p-4 md:p-6 space-y-8 max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary" />
            Tasks
          </h2>
          <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">Stay on top of your responsibilities</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 bg-white border-border/50 rounded-2xl shadow-soft focus:ring-primary/20 focus:border-primary transition-all text-base"
          />
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm w-full">
          {(['pending', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "py-2.5 text-sm font-bold rounded-xl transition-all duration-300 capitalize",
                filter === f
                  ? "bg-primary text-white shadow-soft"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-4 mb-20">
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">Loading tasks...</div>
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
                  onEdit={() => toast.info('Edit functionality coming soon!')}
                  onDelete={() => handleDeleteTask(task.id)}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-white/50 border border-dashed border-border rounded-3xl animate-fade-in flex flex-col items-center justify-center gap-3">
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
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
        </Button>

        <CreateTaskDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onTaskCreate={handleCreateTask}
        />
      </main>
    </div>
  );
};

export default Tasks;

