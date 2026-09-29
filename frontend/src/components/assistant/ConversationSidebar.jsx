import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChatBubbleLeftRight, HiOutlinePlus, HiOutlineXMark } from 'react-icons/hi2';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { cn } from '../../utils/cn';

export default function ConversationSidebar({ conversations, activeId, onSelect, onNew, isOpen, onClose }) {
  const content = (
    <div className="h-full flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-primary)] w-72 flex-shrink-0 relative">
      <div className="p-4 border-b border-[var(--color-border-primary)] flex items-center justify-between">
        <Button variant="primary" fullWidth icon={<HiOutlinePlus />} onClick={onNew}>
          New Chat
        </Button>
        <button onClick={onClose} className="lg:hidden ml-2 p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-primary)] rounded-md transition-colors">
          <HiOutlineXMark className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {(!conversations || conversations.length === 0) ? (
          <div className="text-center py-8 flex flex-col items-center gap-2 text-sm text-[var(--color-text-tertiary)]">
            <HiOutlineChatBubbleLeftRight className="w-8 h-8 opacity-50" />
            <p>No past conversations</p>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]",
                activeId === conv.id 
                  ? "bg-[var(--color-bg-primary)] shadow-sm border border-[var(--color-border-primary)]" 
                  : "hover:bg-[var(--color-bg-primary)]/50 border border-transparent"
              )}
            >
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {conv.title || 'Conversation'}
                </span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">
                  {(conv.updated_at || conv.created_at) ? new Date(conv.updated_at || conv.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] truncate w-full">
                {conv.preview || 'Start chatting...'}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-full">
        {content}
      </div>

      {/* Mobile/Tablet Slide-out Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 shadow-2xl"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
