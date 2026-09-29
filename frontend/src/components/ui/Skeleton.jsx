import { cn } from '../../utils/cn';

export default function Skeleton({ 
  className, 
  width = '100%', 
  height = '16px', 
  rounded = 'md', 
  count = 1 
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'bg-[var(--color-bg-tertiary)]',
            `rounded-${rounded}`,
            className
          )}
          style={{ 
            width, 
            height,
            animation: 'skeleton-pulse 1.5s ease-in-out infinite',
            backgroundImage: 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.08) 50%, transparent 75%)',
            backgroundSize: '200% 100%'
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
