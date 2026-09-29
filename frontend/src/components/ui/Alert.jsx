import { useState } from 'react';
import { cn } from '../../utils/cn';

export default function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className
}) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const variants = {
    info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
    error: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800/50'
  };

  const titleColors = {
    info: 'text-blue-900 dark:text-blue-200',
    success: 'text-emerald-900 dark:text-emerald-200',
    warning: 'text-amber-900 dark:text-amber-200',
    error: 'text-red-900 dark:text-red-200'
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'p-4 rounded-xl border flex items-start gap-3 transition-opacity duration-200',
        variants[variant],
        className
      )}
    >
      <div className="flex-1">
        {title && (
          <h3 className={cn('text-sm font-semibold mb-1', titleColors[variant])}>
            {title}
          </h3>
        )}
        <div className="text-sm opacity-90 leading-relaxed">
          {children}
        </div>
      </div>
      
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)]"
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
