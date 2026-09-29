import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineGlobeAlt,
  HiOutlineTicket,
  HiOutlineChatBubbleLeftRight,
  HiOutlineMapPin,
  HiOutlineCalendarDays,
  HiOutlineArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { citiesAPI, reservationsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import CityGlassVisual from '../../components/ui/CityGlassVisual';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const statusBadge = (status) => {
  const s = status?.toLowerCase();
  if (s === 'confirmed' || s === 'completed') return 'success';
  if (s === 'cancelled') return 'error';
  if (s === 'modified') return 'warning';
  return 'info';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [citiesRes, bookingsRes] = await Promise.all([
          citiesAPI.getAll(),
          reservationsAPI.getMy(),
        ]);
        setCities(citiesRes.data?.slice(0, 4) || []);
        setBookings(bookingsRes.data || []);
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalBookings = bookings.length;
  const activeTrips = bookings.filter(
    (b) => b.status?.toLowerCase() === 'confirmed'
  ).length;
  const citiesExplored = new Set(bookings.map((b) => b.city_name || b.city_id)).size;
  const recentBookings = [...bookings].sort(
    (a, b) => new Date(b.created_at || b.check_in) - new Date(a.created_at || a.check_in)
  ).slice(0, 3);

  const stats = [
    { label: 'Total Bookings', value: totalBookings, icon: <HiOutlineTicket className="w-6 h-6" />, iconBg: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
    { label: 'Active Trips', value: activeTrips, icon: <HiOutlineCalendarDays className="w-6 h-6" />, iconBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
    { label: 'Cities Explored', value: citiesExplored, icon: <HiOutlineGlobeAlt className="w-6 h-6" />, iconBg: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' },
  ];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton height="200px" rounded="2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Skeleton height="120px" rounded="2xl" />
          <Skeleton height="120px" rounded="2xl" />
          <Skeleton height="120px" rounded="2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Welcome Section */}
        <motion.div variants={item} className="relative overflow-hidden rounded-3xl glass-panel glass-panel-hero p-8 sm:p-12 shadow-[var(--shadow-lg)] group">
          <div className="relative z-10 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full text-[var(--color-text-secondary)] text-xs font-medium mb-6">
              <HiOutlineSparkles className="w-4 h-4 text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]" />
              <span>{today}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight text-[var(--color-text-primary)]">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-600)] to-violet-600 dark:from-[var(--color-brand-400)] dark:to-violet-400">{user?.name?.split(' ')[0] || 'Traveler'}</span>!
            </h1>
            <p className="text-[var(--color-text-secondary)] text-lg max-w-2xl leading-relaxed">
              Ready for your next adventure? Explore new destinations or chat with our AI assistant.
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((stat, idx) => (
            <motion.div key={idx} variants={item} whileHover={{ y: -4 }}>
              <StatCard label={stat.label} value={stat.value} icon={stat.icon} iconBg={stat.iconBg} />
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/cities')} icon={<HiOutlineGlobeAlt className="w-5 h-5" />}>
            Explore Cities
          </Button>
          <Button onClick={() => navigate('/assistant')} variant="secondary" icon={<HiOutlineChatBubbleLeftRight className="w-5 h-5" />}>
            Talk to Assistant
          </Button>
          <Button onClick={() => navigate('/bookings')} variant="secondary" icon={<HiOutlineTicket className="w-5 h-5" />}>
            View Bookings
          </Button>
        </motion.div>

        {/* Recommended Cities */}
        {cities.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                Recommended <span className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">Cities</span>
              </h2>
              <button
                onClick={() => navigate('/cities')}
                className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline flex items-center gap-1 text-sm font-medium"
              >
                View All <HiOutlineArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {cities.map((city, i) => (
                <motion.div
                  key={city._id || city.id}
                  variants={item}
                  whileHover={{ y: -6 }}
                >
                  <Card variant="interactive" padding="none" onClick={() => navigate(`/cities/${city._id || city.id}`)} className="group overflow-hidden flex flex-col h-full">
                    <CityGlassVisual city={city} index={i} className="h-36" />
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] transition-colors">
                        {city.name}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1 mt-1">
                        <HiOutlineMapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{city.state}</span>
                      </p>
                      <p className="text-sm text-[var(--color-text-tertiary)] mt-3 line-clamp-2">
                        {city.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Bookings */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
              Recent <span className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">Bookings</span>
            </h2>
            {bookings.length > 3 && (
              <button
                onClick={() => navigate('/bookings')}
                className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline flex items-center gap-1 text-sm font-medium"
              >
                View All <HiOutlineArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          {recentBookings.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {recentBookings.map((booking) => (
                <motion.div
                  key={booking._id || booking.booking_id || booking.id}
                  variants={item}
                  whileHover={{ x: 4 }}
                >
                  <Card variant="interactive" padding="compact" onClick={() => navigate(`/bookings/${booking.booking_id || booking._id || booking.id}`)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-400)] flex items-center justify-center shrink-0">
                          <HiOutlineBuildingOffice2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-[var(--color-text-primary)]">
                            {booking.hotel_name || booking.city_name || 'Booking'}
                          </p>
                          <p className="text-sm text-[var(--color-text-tertiary)]">
                            {(booking.check_in_date || booking.check_in) && new Date(booking.check_in_date || booking.check_in).toLocaleDateString()} –{' '}
                            {(booking.check_out_date || booking.check_out) && new Date(booking.check_out_date || booking.check_out).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-center">
                        <Badge variant={statusBadge(booking.status)}>{booking.status?.toUpperCase()}</Badge>
                        <HiOutlineArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState 
              icon={<HiOutlineTicket className="w-8 h-8" />}
              title="No bookings yet"
              description="Start exploring cities and use the AI Assistant to make your first booking!"
              action={{ label: "Talk to Assistant", onClick: () => navigate('/assistant') }}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
