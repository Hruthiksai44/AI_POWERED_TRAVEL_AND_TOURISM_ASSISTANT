import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className
}) {
  return (
    <div 
      role="tablist" 
      className={cn("flex items-center gap-1 overflow-x-auto hide-scrollbar border-b border-[var(--glass-border)]", className)}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-3 text-sm font-medium outline-none transition-colors duration-200 whitespace-nowrap focus-visible:bg-[var(--color-bg-secondary)] rounded-t-lg",
              isActive 
                ? "text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]" 
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--glass-bg-subtle)]"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            
            {isActive && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-400)]"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
