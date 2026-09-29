import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineCalendarDays, HiOutlineCurrencyRupee, HiOutlineMapPin, HiOutlineClock, HiOutlineChatBubbleLeftRight } from 'react-icons/hi2';
import { itinerariesAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

export default function ItineraryInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    itinerariesAPI.getById(id).then(r => setItinerary(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col">
      <Skeleton height="250px" rounded="none" className="mb-8" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex flex-col gap-6">
        <Skeleton height="150px" rounded="2xl" />
        <Skeleton height="40px" width="30%" />
        <Skeleton height="150px" rounded="2xl" />
        <Skeleton height="150px" rounded="2xl" />
      </div>
    </div>
  );
  if (!itinerary) return <div className="py-20"><EmptyState title="Itinerary not found" action={{ label: 'Go Back', onClick: () => navigate(-1) }} /></div>;

  return (
    <div className="min-h-screen pb-20">
      <div className="relative h-64 bg-gradient-to-br from-emerald-600 to-teal-800 flex items-end">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-10 left-20 w-32 h-32 bg-white/5 rounded-full blur-xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pb-10 w-full z-10 text-center">
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-4xl font-black text-white tracking-tight mb-6">
            {itinerary.name}
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center items-center gap-6 text-white/90">
            <span className="flex items-center gap-2 font-medium bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <HiOutlineCalendarDays className="w-5 h-5 text-emerald-300" /> {itinerary.duration_days} Day{itinerary.duration_days > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-2 font-medium bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <HiOutlineCurrencyRupee className="w-5 h-5 text-emerald-300" /> ₹{itinerary.price?.toLocaleString()}
            </span>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10">
        {itinerary.description && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12">
            <Card>
              <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">Trip Overview</h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed text-lg">{itinerary.description}</p>
            </Card>
          </motion.div>
        )}

        {/* Day-by-day Timeline */}
        <h2 className="text-2xl font-bold mb-8 text-[var(--color-text-primary)]">Day-by-Day Plan</h2>
        <div className="relative">
          <div className="absolute left-6 sm:left-8 top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500 to-teal-500 hidden md:block opacity-30" />
          
          {(itinerary.days || []).sort((a, b) => a.day_number - b.day_number).map((day, i) => (
            <motion.div key={day.id || i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.15 }} className="relative md:pl-20 mb-8 group">
              <div className="absolute left-4 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black hidden md:flex shadow-sm z-10 transition-transform group-hover:scale-110">
                {day.day_number}
              </div>
              
              <Card className="hover:border-emerald-300 dark:hover:border-emerald-700/50 transition-colors">
                <div className="flex items-start gap-4 mb-4">
                  <span className="md:hidden w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 mt-0.5">
                    {day.day_number}
                  </span>
                  <h3 className="text-xl font-bold text-[var(--color-text-primary)] mt-0.5">{day.title}</h3>
                </div>
                
                {day.description && <p className="text-[var(--color-text-secondary)] mb-6 leading-relaxed">{day.description}</p>}
                
                <div className="space-y-4">
                  {(day.activities || []).map((act, j) => (
                    <div key={act.id || j} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-bg-primary)] shadow-sm flex items-center justify-center text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] shrink-0 border border-[var(--color-border-primary)]">
                        {act.time ? <HiOutlineClock className="w-5 h-5" /> : <HiOutlineMapPin className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--color-text-primary)] mb-1 text-base">{act.title}</h4>
                        {act.time && (
                          <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] mb-2">
                            {act.time}
                          </span>
                        )}
                        {act.description && <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mt-1">{act.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Booking Note */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-12">
          <Card className="text-center border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10">
            <div className="max-w-xl mx-auto py-6">
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">Ready to book this trip?</h3>
              <p className="text-[var(--color-text-secondary)] mb-6">A hotel reservation is required to book an itinerary. Talk to our AI assistant to organize everything in one go.</p>
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
