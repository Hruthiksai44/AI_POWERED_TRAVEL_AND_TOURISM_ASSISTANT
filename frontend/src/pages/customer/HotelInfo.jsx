import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineStar, HiOutlineMapPin, HiOutlinePhone, HiOutlineEnvelope, HiOutlineClock, HiOutlineChatBubbleLeftRight, HiOutlineUserGroup, HiOutlineHome } from 'react-icons/hi2';
import { hotelsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function HotelInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hotelsAPI.getById(id).then(r => setHotel(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col">
      <Skeleton height="300px" rounded="none" className="mb-8" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex flex-col gap-6">
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton height="150px" rounded="2xl" />
          <Skeleton height="150px" rounded="2xl" />
          <Skeleton height="150px" rounded="2xl" />
        </div>
        <Skeleton height="200px" rounded="2xl" />
      </div>
    </div>
  );
  if (!hotel) return <div className="py-20"><EmptyState title="Hotel not found" action={{ label: 'Go Back', onClick: () => navigate(-1) }} /></div>;

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <HiOutlineStar
        key={i}
        className={`w-5 h-5 ${i < Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-700'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Banner */}
      <div className="relative h-72 bg-[var(--color-bg-secondary)] flex items-end border-b border-[var(--color-border-primary)]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-10 w-full z-10">
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-4xl sm:text-5xl font-black text-[var(--color-text-primary)] tracking-tight mb-4">
            {hotel.name}
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 bg-[var(--color-bg-primary)] shadow-sm px-3 py-1.5 rounded-full border border-[var(--color-border-primary)]">
              {renderStars(hotel.rating)}
              <span className="font-bold text-[var(--color-text-primary)] ml-1">{hotel.rating}</span>
            </div>
            <span className="flex items-center gap-2 text-[var(--color-text-secondary)] font-medium">
              <HiOutlineMapPin className="w-5 h-5 text-[var(--color-brand-500)]" /> {hotel.address}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Info Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="h-full">
              <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <HiOutlinePhone className="w-5 h-5 text-[var(--color-brand-500)]" /> Contact
              </h3>
              <div className="space-y-3">
                {hotel.contact_phone && <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-3">
                  <span className="font-medium min-w-[50px]">Phone:</span> 
                  <a href={`tel:${hotel.contact_phone}`} className="hover:text-[var(--color-brand-600)] transition-colors">{hotel.contact_phone}</a>
                </p>}
                {hotel.contact_email && <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-3">
                  <span className="font-medium min-w-[50px]">Email:</span> 
                  <a href={`mailto:${hotel.contact_email}`} className="hover:text-[var(--color-brand-600)] transition-colors">{hotel.contact_email}</a>
                </p>}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <HiOutlineClock className="w-5 h-5 text-emerald-500" /> Timings
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-[var(--color-bg-secondary)] px-3 py-2 rounded-lg">
                  <span className="text-sm text-[var(--color-text-secondary)] font-medium">Check-in</span>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">{hotel.check_in_time || '2:00 PM'}</span>
                </div>
                <div className="flex justify-between items-center bg-[var(--color-bg-secondary)] px-3 py-2 rounded-lg">
                  <span className="text-sm text-[var(--color-text-secondary)] font-medium">Check-out</span>
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">{hotel.check_out_time || '12:00 PM'}</span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="h-full">
              <h3 className="font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <HiOutlineStar className="w-5 h-5 text-amber-500" /> Amenities
              </h3>
              <div className="flex flex-wrap gap-2">
                {(hotel.amenities || []).map((a, i) => <Badge key={i} variant="default">{a}</Badge>)}
                {(!hotel.amenities || hotel.amenities.length === 0) && <span className="text-sm text-[var(--color-text-tertiary)]">No amenities listed</span>}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Description */}
        {hotel.description && (
          <Card className="mb-10">
            <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">About the Hotel</h2>
            <p className="text-[var(--color-text-secondary)] leading-relaxed text-lg">{hotel.description}</p>
          </Card>
        )}

        {/* Room Types */}
        <h2 className="text-2xl font-bold mb-6 text-[var(--color-text-primary)]">Available Room Types</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {(hotel.room_types || []).map((rt, i) => (
            <motion.div key={rt.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full flex flex-col hover:border-[var(--color-brand-300)] dark:hover:border-[var(--color-brand-700)] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-4">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">{rt.name}</h3>
                    <Badge variant={rt.category === 'deluxe' ? 'warning' : rt.category === 'ac' ? 'info' : 'default'}>
                      {rt.category?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">₹{rt.price_per_night}</p>
                    <p className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mt-1">per night</p>
                  </div>
                </div>
                {rt.description && <p className="text-sm text-[var(--color-text-secondary)] mb-5 line-clamp-2">{rt.description}</p>}
                
                <div className="mt-auto space-y-4">
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--color-border-primary)]">
                    <div className="flex flex-col items-center p-2 bg-[var(--color-bg-secondary)] rounded-lg">
                      <HiOutlineUserGroup className="w-5 h-5 text-[var(--color-text-tertiary)] mb-1" />
                      <span className="text-xs font-medium text-[var(--color-text-secondary)]">Max {rt.max_occupancy}</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-[var(--color-bg-secondary)] rounded-lg">
                      <HiOutlineHome className="w-5 h-5 text-[var(--color-text-tertiary)] mb-1" />
                      <span className="text-xs font-medium text-[var(--color-text-secondary)]">{rt.total_rooms} Rooms</span>
                    </div>
                  </div>
                  
                  {rt.amenities && rt.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {rt.amenities.map((a, j) => (
                        <span key={j} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-secondary)]">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Booking Note */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="text-center border-2 border-dashed border-[var(--color-brand-300)] dark:border-[var(--color-brand-800)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)/20]">
            <div className="max-w-xl mx-auto py-4">
              <h3 className="text-xl font-bold text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)] mb-2">Ready to book a room?</h3>
              <p className="text-[var(--color-text-secondary)] mb-6">Use our AI Assistant to seamlessly check real-time availability and manage your reservations in one place.</p>
              <Button onClick={() => navigate('/assistant')} size="lg" icon={<HiOutlineChatBubbleLeftRight size={20} />}>
                Talk to AI Assistant
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
