import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'destructive';
  className?: string;
  trend?: string;
  trendUp?: boolean;
}

const variantStyles = {
  default: 'bg-white border border-border shadow-soft',
  accent: 'bg-primary/5 border border-primary/10 shadow-soft',
  success: 'bg-success/5 border border-success/10 shadow-soft',
  warning: 'bg-warning/5 border border-warning/10 shadow-soft',
  destructive: 'bg-destructive/5 border border-destructive/10 shadow-soft',
};

const iconStyles = {
  default: 'bg-primary/10 text-primary',
  accent: 'bg-primary/15 text-primary',
  success: 'bg-success/20 text-success',
  warning: 'bg-warning/20 text-warning',
  destructive: 'bg-destructive/20 text-destructive',
};

export const StatCard = ({ title, value, icon: Icon, variant = 'default', className, trend, trendUp }: StatCardProps) => {
  return (
    <div
      className={cn(
        "p-3 sm:p-5 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-soft-lg animate-fade-in",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={cn("p-2 sm:p-3 rounded-xl", iconStyles[variant])}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {trend && (
              <span className={cn(
                "hidden xs:inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                trendUp ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
              )}>
                {trend}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate uppercase tracking-wider">{title}</p>
        </div>
      </div>
    </div>
  );
};
