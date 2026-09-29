import { cn } from '../../utils/cn';

export default function Card({
  variant = 'default',
  padding = 'default',
  onClick,
  className,
  children
}) {
  const isInteractive = variant === 'interactive' || !!onClick;

  const variants = {
    default: 'glass-surface',
    interactive: 'glass-interactive active:scale-[0.99]',
    outlined: 'bg-transparent border-2 border-[var(--glass-border)]'
  };

  const paddings = {
    none: 'p-0',
    compact: 'p-4',
    default: 'p-6'
  };

  const Wrapper = isInteractive ? 'button' : 'div';
  
  const interactiveProps = isInteractive ? {
    onClick,
    type: 'button',
    className: cn(
      'w-full text-left rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]',
      variants.interactive,
      paddings[padding],
      className
    )
  } : {
    className: cn(
      'w-full rounded-2xl',
      variants[variant],
      paddings[padding],
      className
    )
  };

  return (
    <Wrapper {...interactiveProps}>
      {children}
    </Wrapper>
  );
}
