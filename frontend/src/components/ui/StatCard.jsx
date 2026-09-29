import { cn } from '../../utils/cn';
import Card from './Card';
import Skeleton from './Skeleton';
import { HiArrowUpRight, HiArrowDownRight } from 'react-icons/hi2';

export default function StatCard({
  label,
  value,
  icon,
  iconBg,
  trend,
  loading = false,
  className
}) {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
          </span>
          
          {loading ? (
            <Skeleton className="mt-1" width="100px" height="28px" />
          ) : (
            <span className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">
              {value}
            </span>
          )}
        </div>
        
        {icon && (
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            iconBg || "bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-400)]"
          )}>
            {icon}
          </div>
        )}
      </div>

      {trend && !loading && (
        <div className="flex items-center gap-2 text-sm mt-1">
          <span className={cn(
            "flex items-center font-medium",
            trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
          )}>
            {trend.direction === 'up' ? (
              <HiArrowUpRight className="w-4 h-4 mr-1" />
            ) : (
              <HiArrowDownRight className="w-4 h-4 mr-1" />
            )}
            {trend.value}%
          </span>
          <span className="text-[var(--color-text-tertiary)]">
            vs {trend.period || 'last month'}
          </span>
        </div>
      )}
      
      {loading && trend && (
        <Skeleton className="mt-1" width="140px" height="20px" />
      )}
    </Card>
  );
}
