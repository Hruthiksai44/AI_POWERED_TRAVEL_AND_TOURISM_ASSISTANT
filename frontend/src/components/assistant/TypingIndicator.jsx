import { motion } from 'framer-motion';
import Avatar from '../ui/Avatar';

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 max-w-4xl w-full mx-auto flex-row">
      <Avatar size="md" name="Assistant" className="bg-indigo-600 text-white" />
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">TravelBot</span>
        </div>
        <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] px-5 py-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
          <motion.div animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]" />
          <motion.div animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]" />
          <motion.div animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]" />
        </div>
      </div>
    </div>
  );
}
