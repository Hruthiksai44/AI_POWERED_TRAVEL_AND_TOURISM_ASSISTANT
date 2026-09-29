import { useState, useRef, useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { HiOutlineChevronDown, HiOutlineCheck } from 'react-icons/hi2';
import Input from './Input';

export default function Dropdown({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled = false,
  searchable = false,
  className
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const id = useId();
  
  const isSearchable = searchable || options.length > 8;
  const filteredOptions = isSearchable && search 
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;
    
  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e, val) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(val);
    }
  };

  return (
    <div className={cn("relative w-full flex flex-col gap-1.5", className)} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-primary)]" id={`${id}-label`}>
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${id}-label` : undefined}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-2 glass-interactive text-left text-sm rounded-xl outline-none transition-all duration-200 shadow-inner',
          isOpen ? 'border-[var(--glass-border-highlight)] ring-1 ring-[var(--glass-border-highlight)] bg-[var(--glass-bg)]' : 'border-[var(--glass-border)]',
          error ? 'border-red-500' : '',
          disabled ? 'opacity-50 cursor-not-allowed bg-black/5 dark:bg-white/5' : 'hover:border-[var(--glass-border-highlight)]',
          !selectedOption ? 'text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
        )}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="text-[var(--color-text-secondary)]">{selectedOption.icon}</span>}
              {selectedOption.label}
            </>
          ) : placeholder}
        </span>
        <HiOutlineChevronDown className={cn("w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {error && (
        <p className="text-sm text-red-500 font-medium mt-0.5">{error}</p>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1.5 top-full glass-surface-strong rounded-xl overflow-hidden flex flex-col"
          >
            {isSearchable && (
              <div className="p-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg-subtle)]">
                <Input
                  size="sm"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            
            <ul 
              role="listbox" 
              className="max-h-60 overflow-y-auto py-1"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-[var(--color-text-tertiary)] text-center">
                  No options found
                </li>
              ) : (
                filteredOptions.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={value === opt.value}
                    tabIndex={0}
                    onClick={() => handleSelect(opt.value)}
                    onKeyDown={(e) => handleKeyDown(e, opt.value)}
                    className={cn(
                      'flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer outline-none transition-colors',
                      value === opt.value 
                        ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]' 
                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] focus:bg-[var(--color-bg-secondary)]'
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {opt.icon && <span className={value === opt.value ? 'text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]' : 'text-[var(--color-text-secondary)]'}>{opt.icon}</span>}
                      {opt.label}
                    </span>
                    {value === opt.value && <HiOutlineCheck className="w-4 h-4 shrink-0" />}
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
