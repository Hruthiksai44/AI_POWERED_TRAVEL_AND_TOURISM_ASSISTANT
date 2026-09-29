import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { HiOutlineChevronRight, HiOutlineHome } from 'react-icons/hi2';

export default function Breadcrumb({ items = [], className }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-sm", className)}>
      <ol className="flex items-center gap-2 flex-wrap">
        <li>
          <Link 
            to="/" 
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
            aria-label="Home"
          >
            <HiOutlineHome className="w-4 h-4" />
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-2">
              <HiOutlineChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0" />
              
              {isLast || !item.href ? (
                <span 
                  className="font-medium text-[var(--color-text-primary)]" 
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link 
                  to={item.href}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-sm"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
