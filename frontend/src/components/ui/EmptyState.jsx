import { cn } from '../../utils/cn';
import Button from './Button';

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] backdrop-blur-sm',
      className
    )}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick} variant="secondary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
