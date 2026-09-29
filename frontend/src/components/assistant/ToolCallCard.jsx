import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineWrenchScrewdriver, HiOutlineChevronDown } from 'react-icons/hi2';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

export default function ToolCallCard({ toolName, args, result }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 border border-[var(--color-border-primary)] rounded-xl overflow-hidden bg-[var(--color-bg-primary)] shadow-sm">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-border-primary)] transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <HiOutlineWrenchScrewdriver className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">Used tool</span>
          <Badge variant="default" className="text-xs px-1.5 py-0">{toolName}</Badge>
        </div>
        <HiOutlineChevronDown className={cn("w-4 h-4 text-[var(--color-text-tertiary)] transition-transform duration-200", expanded && "rotate-180")} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-[var(--color-border-primary)] text-xs font-mono text-[var(--color-text-tertiary)] bg-[var(--color-bg-primary)] space-y-3">
              <div>
                <span className="text-[var(--color-text-secondary)] font-bold block mb-1">Arguments:</span>
                <pre className="overflow-x-auto p-2 bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-primary)]">
                  {typeof args === 'object' ? JSON.stringify(args, null, 2) : args}
                </pre>
              </div>
              {result && (
                <div>
                  <span className="text-[var(--color-text-secondary)] font-bold block mb-1">Result:</span>
                  <pre className="overflow-x-auto p-2 bg-[var(--color-bg-secondary)] rounded-md border border-[var(--color-border-primary)]">
                    {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
