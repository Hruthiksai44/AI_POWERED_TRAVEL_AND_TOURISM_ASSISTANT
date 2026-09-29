import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineStar, HiOutlineChatBubbleBottomCenterText } from 'react-icons/hi2';
import { feedbackAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Table from '../../components/ui/Table';

export default function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    feedbackAPI.getAll().then(r => setFeedbacks(r.data)).catch(console.error).finally(() => setLoading(false)); 
  }, []);

  const avgRating = feedbacks.length ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : 0;
  const dist = [1, 2, 3, 4, 5].map(r => ({ rating: r, count: feedbacks.filter(f => f.rating === r).length }));

  if (loading) return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <Skeleton height="36px" width="250px" className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Skeleton height="200px" rounded="2xl" />
        <Skeleton height="200px" rounded="2xl" />
      </div>
      <Skeleton height="400px" rounded="2xl" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Feedback Management</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Monitor and analyze customer satisfaction</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center text-center py-10">
          <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-4">Average Rating</p>
          <p className="text-6xl font-black text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] mb-3">{avgRating}</p>
          <div className="flex gap-1.5 mb-2">
            {Array.from({ length: 5 }, (_, i) => (
              <HiOutlineStar key={i} className={`w-7 h-7 ${i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-[var(--color-border-primary)]'}`} />
            ))}
          </div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{feedbacks.length} total reviews</p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-6">Rating Distribution</p>
          <div className="space-y-3">
            {dist.reverse().map(d => {
              const pct = feedbacks.length ? (d.count / feedbacks.length) * 100 : 0;
              return (
                <div key={d.rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-10 shrink-0">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">{d.rating}</span>
                    <HiOutlineStar className="w-4 h-4 text-amber-400 fill-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-secondary)] w-10 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table 
          columns={[
            {
              key: 'user_name',
              label: 'User',
              render: (name) => (
                <span className="text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                  {name || 'Anonymous'}
                </span>
              )
            },
            {
              key: 'rating',
              label: 'Rating',
              render: (rating) => (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, j) => (
                    <HiOutlineStar key={j} className={`w-3.5 h-3.5 ${j < rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-border-primary)]'}`} />
                  ))}
                </div>
              )
            },
            {
              key: 'comment',
              label: 'Comment',
              render: (comment) => (
                <span className="text-sm text-[var(--color-text-secondary)] max-w-xs truncate block" title={comment}>
                  {comment ? <span className="italic">"{comment}"</span> : '-'}
                </span>
              )
            },
            {
              key: 'category',
              label: 'Category',
              render: (category) => (
                <Badge variant="info" className="capitalize">{category?.replace('_', ' ') || 'General'}</Badge>
              )
            },
            {
              key: 'created_at',
              label: 'Date',
              render: (date) => (
                <span className="text-sm font-medium text-[var(--color-text-tertiary)] whitespace-nowrap">
                  {new Date(date).toLocaleDateString()}
                </span>
              )
            }
          ]}
          data={feedbacks}
          loading={loading}
          emptyState={
            <EmptyState 
              icon={<HiOutlineChatBubbleBottomCenterText className="w-10 h-10" />}
              title="No feedback received"
              description="When customers leave feedback, it will appear here."
            />
          }
        />
      </motion.div>
    </div>
  );
}
