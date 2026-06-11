import { useState } from 'react';
import { Calendar, Check, Tag, Edit2, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TaskItemProps {
  task: Task;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TaskItem = ({ task, onToggle, onEdit, onDelete }: TaskItemProps) => {
  const { adminName } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const isPending = task.status === 'pending';
  const canToggle = !task.createdBy || task.createdBy.trim().toLowerCase() === adminName.trim().toLowerCase();

  return (
    <>
      <div
        onClick={() => setShowDetails(true)}
        className={cn(
          "flex items-start gap-4 p-4 bg-white border border-border/50 rounded-2xl shadow-soft transition-all duration-300 hover:shadow-soft-lg animate-fade-in group cursor-pointer hover:border-primary/20",
          isPending ? "border-l-4 border-l-warning" : "border-l-4 border-l-success opacity-80"
        )}
      >
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent opening details dialog when toggling
            if (canToggle && onToggle) onToggle();
          }}
          disabled={!canToggle}
          className={cn(
            "w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0 mt-0.5",
            !canToggle 
              ? "border-muted-foreground/20 bg-muted/10 cursor-not-allowed opacity-60"
              : isPending
                ? "border-muted-foreground/30 hover:border-success hover:bg-success/10 group-hover:scale-110"
                : "border-success bg-success text-white shadow-sm"
          )}
        >
          {!isPending && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "text-base font-bold truncate tracking-tight transition-all duration-300",
              !isPending ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"
            )}
          >
            {task.title}
          </h3>
          {task.createdBy && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-tight whitespace-nowrap">
                ✍️ By: {task.createdBy}
              </span>
            </div>
          )}
        </div>

        <div className="hidden sm:block shrink-0 mt-1">
          <span
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest border",
              isPending
                ? "bg-warning/5 text-warning border-warning/10"
                : "bg-success/5 text-success border-success/10"
            )}
          >
            {isPending ? 'Pending' : 'Completed'}
          </span>
        </div>

        {/* Edit and Delete Buttons */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening details dialog when editing
                onEdit();
              }}
              className="w-9 h-9 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
              title="Edit task"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation(); // Prevent opening details dialog when deleting
                onDelete();
              }}
              className="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Task Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">Task Details</DialogTitle>
            <DialogDescription className="sr-only">Detailed view of task assignments and deadlines.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Title</label>
              <h4 className="text-lg font-black text-foreground mt-0.5">{task.title}</h4>
            </div>

            {task.description && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Description</label>
                <div className="text-sm text-foreground bg-muted/30 p-3 rounded-2xl border border-border/30 mt-1 whitespace-pre-wrap leading-relaxed">
                  {task.description}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Due Date</label>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-xl border border-border/50">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  {task.dueDate}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Category</label>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-2.5 py-1.5 rounded-xl border border-primary/10 uppercase tracking-tighter">
                  <Tag className="w-4 h-4 shrink-0" />
                  {task.category}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Status</label>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border uppercase tracking-wider",
                  isPending
                    ? "bg-warning/5 text-warning border-warning/10"
                    : "bg-success/5 text-success border-success/10"
                )}
              >
                {isPending ? '⏳ Pending' : '✅ Completed'}
              </span>
            </div>

            {task.assignedToName && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Assigned Yuvaks</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {task.assignedToName.split(',').map((name, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      👤 {name.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {task.createdBy && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Created By</label>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-tight">
                  ✍️ {task.createdBy}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
