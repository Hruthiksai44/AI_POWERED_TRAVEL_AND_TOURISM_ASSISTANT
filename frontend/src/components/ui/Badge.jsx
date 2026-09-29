import { cn } from '../../utils/cn';

export default function Badge({
  variant = 'default',
  dot = false,
  children,
  className
}) {
  const variants = {
    default: 'bg-[var(--glass-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--glass-border)] backdrop-blur-sm',
    brand: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-200)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-700)]',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    error: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
  };

  const dotColors = {
    default: 'bg-[var(--color-text-tertiary)]',
    brand: 'bg-[var(--color-brand-500)]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
      variants[variant],
      className
    )}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
