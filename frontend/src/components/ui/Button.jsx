import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const Button = forwardRef(({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  type = 'button',
  onClick,
  children,
  className,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-border-focus)]';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:scale-[0.98] border border-white/20 relative overflow-hidden hover:brightness-110 transition-all',
    secondary: 'glass-interactive text-[var(--color-text-primary)] active:scale-[0.98]',
    ghost: 'text-[var(--color-text-secondary)] hover:glass-surface hover:text-[var(--color-text-primary)] active:scale-[0.98] transition-all',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:brightness-110 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:scale-[0.98] border border-white/20',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:brightness-110 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] active:scale-[0.98] border border-white/20'
  };

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs gap-1.5',
    sm: 'px-3 py-2 text-sm gap-2',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
    xl: 'px-8 py-4 text-lg gap-3'
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed active:scale-100 hover:shadow-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      
      {children}
      
      {!loading && iconRight && (
        <span className="shrink-0">{iconRight}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
