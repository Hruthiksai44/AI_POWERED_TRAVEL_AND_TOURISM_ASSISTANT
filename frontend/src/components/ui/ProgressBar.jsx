import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function ProgressBar({
  value = 0,
  variant = 'brand',
  indeterminate = false,
  className
}) {
  const variants = {
    brand: 'bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-500)]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500'
  };

  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div 
      role="progressbar" 
      aria-valuenow={indeterminate ? undefined : clampedValue} 
      aria-valuemin={0} 
      aria-valuemax={100}
      className={cn(
        "w-full h-2 overflow-hidden rounded-full bg-[var(--color-bg-tertiary)] relative", 
        className
      )}
    >
      {indeterminate ? (
        <motion.div
          className={cn("absolute top-0 bottom-0 rounded-full w-1/3", variants[variant])}
          animate={{
            x: ["-100%", "300%"]
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: "linear"
          }}
        />
      ) : (
        <motion.div
          className={cn("h-full rounded-full", variants[variant])}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}
    </div>
  );
}
