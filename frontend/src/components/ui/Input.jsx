import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

const Input = forwardRef(({
  label,
  error,
  helper,
  icon,
  type = 'text',
  size = 'md',
  required = false,
  disabled = false,
  className,
  ...props
}, ref) => {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label 
          htmlFor={id} 
          className="text-sm font-medium text-[var(--color-text-primary)]"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3 text-[var(--color-text-tertiary)] pointer-events-none">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={cn(error ? errorId : undefined, helper ? helperId : undefined)}
          className={cn(
            'w-full bg-[var(--glass-bg-subtle)] text-[var(--color-text-primary)] border border-[var(--glass-border)] rounded-xl outline-none transition-all duration-200 placeholder:text-[var(--color-text-tertiary)] shadow-inner backdrop-blur-md',
            'focus:border-[var(--glass-border-highlight)] focus:ring-1 focus:ring-[var(--glass-border-highlight)] focus:bg-[var(--glass-bg)]',
            disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-bg-secondary)]',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            icon && 'pl-10',
            sizes[size],
            className
          )}
          {...props}
        />
      </div>

      {error && (
        <p id={errorId} className="text-sm text-red-500 font-medium mt-0.5">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p id={helperId} className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
