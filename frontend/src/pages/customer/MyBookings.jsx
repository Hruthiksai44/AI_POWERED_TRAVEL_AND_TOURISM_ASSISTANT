import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineBuildingOffice2, HiOutlineCalendarDays, HiOutlineArrowRight, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { reservationsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const statusColors = { 
  confirmed: 'success', 
  cancelled: 'error', 
  modified: 'warning', 
  pending: 'info', 
  completed: 'success' 
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reservationsAPI.getMy().then(r => setBookings(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton height="40px" width="250px" className="mb-2" />
          <Skeleton height="20px" width="300px" className="mb-8" />
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="140px" rounded="xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)] tracking-tight">My Bookings</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Track and manage your hotel reservations</p>
      </motion.div>

      {bookings.length === 0 ? (
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <EmptyState 
            icon={<HiOutlineBuildingOffice2 className="w-10 h-10" />}
            title="No bookings yet"
            description="Start by exploring cities and talking to our AI assistant"
            action={{ label: "Talk to AI Assistant", onClick: () => navigate('/assistant') }}
          />
        </motion.div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b, i) => (
            <motion.div key={b.booking_id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <Card 
                variant="interactive" 
                padding="compact" 
                onClick={() => navigate(`/bookings/${b.booking_id}`)}
                className="group flex flex-col md:flex-row md:items-center gap-5"
              >
                <div className="w-14 h-14 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-900)/30] dark:text-[var(--color-brand-400)] flex items-center justify-center shrink-0 border border-[var(--color-brand-100)] dark:border-[var(--color-brand-800)]">
                  <HiOutlineBuildingOffice2 className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-bold text-lg text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] transition-colors truncate">
                      {b.hotel_name}
                    </h3>
                    <Badge variant={statusColors[b.status?.toLowerCase()] || 'info'}>
                      {b.status?.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-[var(--color-text-secondary)] truncate">
                    {b.city_name} <span className="mx-1.5 text-[var(--color-text-tertiary)]">•</span> {b.room_type_name} <span className="mx-1.5 text-[var(--color-text-tertiary)]">•</span> {b.num_rooms} room{b.num_rooms > 1 ? 's' : ''}
                  </p>
                  
                  <div className="flex items-center gap-2 text-sm text-[var(--color-text-tertiary)] mt-1">
                    <HiOutlineCalendarDays className="w-4 h-4 shrink-0" />
                    <span>{b.check_in_date}</span>
                    <HiOutlineArrowRight className="w-3.5 h-3.5" />
                    <span>{b.check_out_date}</span>
                  </div>
                </div>
                
                <div className="md:text-right flex flex-row md:flex-col justify-between items-center md:items-end mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-[var(--color-border-primary)]">
                  <p className="text-xs font-medium text-[var(--color-text-tertiary)] font-mono uppercase tracking-wider md:mb-2">{b.booking_id}</p>
                  <p className="text-xl font-black text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">₹{b.total_price}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {bookings.length > 0 && (
        <Card className="mt-6 bg-[var(--color-bg-secondary)] border-dashed text-center">
          <p className="text-sm text-[var(--color-text-secondary)] flex items-center justify-center gap-2 flex-wrap">
            <span className="text-lg">💡</span> 
            To modify or cancel a booking, use the 
            <button onClick={() => navigate('/assistant')} className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline font-semibold flex items-center gap-1">
              AI Assistant <HiOutlineChatBubbleLeftRight className="w-4 h-4" />
            </button>
          </p>
        </Card>
      )}
    </div>
  );
}
