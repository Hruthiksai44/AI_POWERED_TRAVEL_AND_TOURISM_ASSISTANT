import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineStar } from 'react-icons/hi2';
import { feedbackAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    feedbackAPI.getMy()
      .then(r => setFeedbacks(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!rating) return toast.error('Please select a rating');
    setSubmitting(true);
    try {
      await feedbackAPI.submit({ rating, comment, category });
      toast.success('Thank you for your feedback!');
      setRating(0); 
      setComment(''); 
      setCategory('general');
      const r = await feedbackAPI.getMy();
      setFeedbacks(r.data);
    } catch { 
      toast.error('Failed to submit feedback'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-8">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)] tracking-tight">Feedback</h1>
        <p className="text-[var(--color-text-secondary)]">Help us improve your experience</p>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 sm:p-8">
          <h2 className="text-xl font-bold mb-6 text-[var(--color-text-primary)] text-center">Rate Your Experience</h2>
          
          <div className="flex gap-2 sm:gap-4 mb-8 justify-center">
            {[1, 2, 3, 4, 5].map(star => (
              <button 
                key={star} 
                onClick={() => setRating(star)} 
                onMouseEnter={() => setHover(star)} 
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded-full p-1"
              >
                <HiOutlineStar className={`w-12 h-12 transition-colors ${star <= (hover || rating) ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-[var(--color-text-tertiary)]'}`} />
              </button>
            ))}
          </div>

          <div className="space-y-5 max-w-xl mx-auto">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Category</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                className="w-full h-11 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all"
              >
                <option value="general">General Feedback</option>
                <option value="service">Customer Service</option>
                <option value="hotels">Hotel Experience</option>
                <option value="ai_assistant">AI Assistant</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Comment (Optional)</label>
              <textarea 
                value={comment} 
                onChange={e => setComment(e.target.value)} 
                rows={4} 
                className="w-full px-3 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all resize-none" 
                placeholder="Tell us about your experience..." 
              />
            </div>
            
            <div className="pt-2">
              <Button onClick={handleSubmit} loading={submitting} fullWidth size="lg">
                Submit Feedback
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Your Past Feedback</h2>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} height="120px" rounded="xl" />
            ))}
          </div>
        ) : feedbacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbacks.map((fb, i) => (
              <motion.div key={fb.id || i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, j) => (
                        <HiOutlineStar key={j} className={`w-4 h-4 ${j < fb.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-text-tertiary)]'}`} />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-[var(--color-text-tertiary)]">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {fb.comment ? (
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed flex-1 mb-4 italic">"{fb.comment}"</p>
                  ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] flex-1 mb-4 italic">No comment provided</p>
                  )}
                  
                  <div className="mt-auto pt-3 border-t border-[var(--color-border-primary)]">
                    <Badge variant="default" className="capitalize">{fb.category?.replace('_', ' ')}</Badge>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={<HiOutlineStar className="w-8 h-8" />}
            title="No past feedback"
            description="You haven't submitted any feedback yet. We'd love to hear from you!"
          />
        )}
      </motion.div>
    </div>
  );
}
