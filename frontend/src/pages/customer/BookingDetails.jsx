import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineArrowLeft, HiOutlineBuildingOffice2, HiOutlineChatBubbleLeftRight, HiOutlineDocumentText } from 'react-icons/hi2';
import { reservationsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reservationsAPI.getById(bookingId).then(r => setBooking(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto w-full">
        <Skeleton height="30px" width="150px" className="mb-6" />
        <Skeleton height="500px" rounded="2xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-20">
        <EmptyState 
          icon={<HiOutlineDocumentText className="w-12 h-12" />}
          title="Booking not found"
          description="We couldn't find the booking you are looking for."
          action={{ label: "Go to My Bookings", onClick: () => navigate('/bookings') }}
        />
      </div>
    );
  }

  const statusColor = { 
    confirmed: 'success', 
    completed: 'success',
    cancelled: 'error', 
    modified: 'warning', 
    pending: 'info' 
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button 
          onClick={() => navigate('/bookings')}
          className="flex items-center gap-1 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-400)] transition-colors mb-6"
        >
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Bookings
        </button>
        
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8 pb-6 border-b border-[var(--color-border-primary)]">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2 font-mono tracking-tight">Booking {booking.booking_id}</h1>
              <Badge variant={statusColor[booking.status?.toLowerCase()] || 'info'}>
                {booking.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-900)/30] dark:text-[var(--color-brand-400)] flex items-center justify-center shrink-0 border border-[var(--color-brand-100)] dark:border-[var(--color-brand-800)] hidden sm:flex">
              <HiOutlineBuildingOffice2 className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              ['Hotel', booking.hotel_name, 'col-span-2 sm:col-span-2'],
              ['City', booking.city_name, 'col-span-2 sm:col-span-2'],
              ['Room Type', booking.room_type_name, 'col-span-2'],
              ['Total Price', `₹${booking.total_price}`, 'col-span-2'],
              ['Check-in', booking.check_in_date, 'col-span-1'],
              ['Check-out', booking.check_out_date, 'col-span-1'],
              ['Rooms', booking.num_rooms, 'col-span-1'],
              ['Guests', booking.num_guests, 'col-span-1'],
            ].map(([label, value, spanClass]) => (
              <div key={label} className={`p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] ${spanClass}`}>
                <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">{label}</p>
                <p className="font-bold text-[var(--color-text-primary)] text-sm sm:text-base">{value || 'N/A'}</p>
              </div>
            ))}
          </div>

          {booking.special_requests && (
            <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 mb-8">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-1">Special Requests</p>
              <p className="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">{booking.special_requests}</p>
            </div>
          )}

          {booking.itinerary_names && booking.itinerary_names.length > 0 && (
            <div className="p-5 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 mb-8">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-500 mb-2">Attached Itineraries</p>
              <div className="space-y-2">
                {booking.itinerary_names.map((n, i) => (
                  <p key={i} className="text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" /> {n}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-[var(--color-border-primary)] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-medium text-[var(--color-text-tertiary)]">
            <p>Booked: {booking.created_at ? new Date(booking.created_at).toLocaleString() : 'N/A'}</p>
            {booking.updated_at && <p>Updated: {new Date(booking.updated_at).toLocaleString()}</p>}
            {booking.cancelled_at && <p className="text-red-500">Cancelled: {new Date(booking.cancelled_at).toLocaleString()}</p>}
          </div>
        </Card>

        <Card className="mt-6 bg-[var(--color-bg-secondary)] border-dashed text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="text-left flex-1 max-w-sm">
              <h4 className="font-semibold text-[var(--color-text-primary)] text-sm mb-1">Need to make changes?</h4>
              <p className="text-xs text-[var(--color-text-secondary)]">To modify dates or cancel this booking, please talk to our AI Assistant.</p>
            </div>
            <Button onClick={() => navigate('/assistant')} variant="primary" icon={<HiOutlineChatBubbleLeftRight className="w-4 h-4" />}>
              Talk to AI Assistant
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
