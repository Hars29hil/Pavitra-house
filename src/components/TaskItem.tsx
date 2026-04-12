import { Calendar, Check, Clock, Tag, Edit2, Trash2 } from 'lucide-react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TaskItemProps {
  task: Task;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TaskItem = ({ task, onToggle, onEdit, onDelete }: TaskItemProps) => {
  const isPending = task.status === 'pending';

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-5 bg-white border border-border/50 rounded-2xl shadow-soft transition-all duration-300 hover:shadow-soft-lg animate-fade-in group",
        isPending ? "border-l-4 border-warning" : "border-l-4 border-success opacity-80"
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          "w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0",
          isPending
            ? "border-muted-foreground/30 hover:border-success hover:bg-success/10 group-hover:scale-110"
            : "border-success bg-success text-white shadow-sm"
        )}
      >
        {!isPending && <Check className="w-4 h-4 stroke-[3]" />}
      </button>

      <div className="flex-1 min-w-0">
        <h3
          className={cn(
            "text-lg font-bold truncate tracking-tight transition-all duration-300",
            !isPending ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"
          )}
        >
          {task.title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/30 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5" />
            {task.dueDate}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 uppercase tracking-tighter">
            <Tag className="w-3.5 h-3.5" />
            {task.category}
          </span>
          {task.assignedToName && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              👤 {task.assignedToName}
            </span>
          )}
        </div>
      </div>

      <div className="hidden sm:block shrink-0">
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
      <div className="flex items-center gap-2 shrink-0">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
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
            onClick={onDelete}
            className="w-9 h-9 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

