import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineChatBubbleLeftRight, HiOutlineMapPin, HiOutlineCalendar, HiOutlineChevronDown, HiOutlineChevronUp } from 'react-icons/hi2';
import { conversationsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

export default function ConversationHistory() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    conversationsAPI.getMy().then(r => setConversations(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const loadMessages = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    try {
      const res = await conversationsAPI.getById(id);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: res.data.messages } : c));
      setExpanded(id);
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div>
          <Skeleton height="40px" width="300px" className="mb-2" />
          <Skeleton height="20px" width="400px" className="mb-8" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height="100px" rounded="xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)] tracking-tight">Conversation History</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Review your past conversations with the AI assistant</p>
      </motion.div>

      {conversations.length === 0 ? (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <EmptyState 
            icon={<HiOutlineChatBubbleLeftRight className="w-10 h-10" />}
            title="No conversations yet"
            description="Start chatting with the AI Assistant to plan your next trip."
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          {conversations.map((c, i) => (
            <motion.div key={c.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <Card 
                padding="none" 
                className={`overflow-hidden transition-all duration-300 ${expanded === c.id ? 'ring-2 ring-[var(--color-brand-500)] shadow-lg' : 'hover:border-[var(--color-brand-300)] dark:hover:border-[var(--color-brand-700)]'}`}
              >
                <button 
                  onClick={() => loadMessages(c.id)} 
                  className="w-full text-left p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 focus:outline-none"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between sm:justify-start gap-4 mb-2">
                      <h3 className="font-bold text-lg text-[var(--color-text-primary)] truncate">{c.title || 'Trip Planning Conversation'}</h3>
                      <span className="sm:hidden text-xs font-medium text-[var(--color-text-tertiary)] bg-[var(--color-bg-secondary)] px-2 py-1 rounded-md">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      {c.city_name && (
                        <Badge variant="brand" className="gap-1 flex items-center">
                          <HiOutlineMapPin className="w-3 h-3" /> {c.city_name}
                        </Badge>
                      )}
                      <span className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5">
                        <HiOutlineChatBubbleLeftRight className="w-4 h-4 text-[var(--color-text-tertiary)]" /> {c.message_count} messages
                      </span>
                      <span className="text-[var(--color-text-tertiary)] hidden sm:inline">•</span>
                      <Badge variant={c.status === 'active' ? 'success' : 'default'} className="uppercase text-[10px] tracking-wider">
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="hidden sm:flex flex-col items-end gap-3 shrink-0">
                    <span className="text-xs font-medium text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                      <HiOutlineCalendar className="w-3.5 h-3.5" /> {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-bg-secondary)] flex items-center justify-center text-[var(--color-text-secondary)] transition-transform">
                      {expanded === c.id ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>
                
                <AnimatePresence>
                  {expanded === c.id && c.messages && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border-primary)]"
                    >
                      <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {c.messages.map((msg, j) => (
                          <div key={j} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 sm:px-5 py-3 text-sm sm:text-base shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-[var(--color-brand-600)] text-white rounded-tr-sm' 
                                : 'bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] rounded-tl-sm'
                            }`}>
                              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
