import { cn } from '../../utils/cn';

export default function Avatar({
  name,
  src,
  size = 'md',
  className
}) {
  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div 
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-[var(--color-brand-100)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-200)] font-medium border border-[var(--color-border-primary)]',
        sizes[size],
        className
      )}
      aria-label={`User avatar for ${name || 'unknown'}`}
    >
      {src ? (
        <img 
          src={src} 
          alt={name || 'Avatar'} 
          className="w-full h-full object-cover" 
          loading="lazy"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
