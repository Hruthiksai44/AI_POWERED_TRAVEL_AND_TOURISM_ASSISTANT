import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlinePhone,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineChartBar,
  HiOutlineTicket,
  HiOutlineCurrencyRupee,
  HiOutlineMapPin,
  HiOutlineBuildingOffice2,
  HiOutlineClock,
  HiOutlineArrowPath,
  HiOutlineArrowTrendingUp,
  HiOutlineCalendar,
  HiOutlineUser,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <Skeleton height="36px" width="200px" className="mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <Skeleton key={i} height="120px" rounded="xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height="300px" rounded="2xl" />
          <Skeleton height="300px" rounded="2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20">
        <EmptyState 
          icon={<HiOutlineXCircle className="w-12 h-12 text-red-500" />}
          title="Failed to Load Data"
          description={error}
          action={{ label: 'Retry', onClick: fetchDashboard, icon: <HiOutlineArrowPath className="w-4 h-4" /> }}
        />
      </div>
    );
  }

  const stats = [
    { label: 'Total Calls', value: data?.total_calls?.toLocaleString() || '0', icon: <HiOutlinePhone className="w-6 h-6" />, bg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { label: 'Successful', value: data?.successful_calls?.toLocaleString() || '0', icon: <HiOutlineCheckCircle className="w-6 h-6" />, bg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { label: 'Unsuccessful', value: data?.unsuccessful_calls?.toLocaleString() || '0', icon: <HiOutlineXCircle className="w-6 h-6" />, bg: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' },
    { label: 'Success Rate', value: `${(data?.success_ratio || 0).toFixed(1)}%`, icon: <HiOutlineChartBar className="w-6 h-6" />, bg: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
    { label: 'Reservations', value: data?.total_reservations?.toLocaleString() || '0', icon: <HiOutlineTicket className="w-6 h-6" />, bg: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { label: 'Revenue', value: `₹${(data?.total_revenue || 0).toLocaleString()}`, icon: <HiOutlineCurrencyRupee className="w-6 h-6" />, bg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  ];

  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const activityIcons = {
    call: <HiOutlinePhone className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    booking: <HiOutlineTicket className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    reservation: <HiOutlineTicket className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
    user: <HiOutlineUser className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    default: <HiOutlineClock className="w-5 h-5 text-gray-600 dark:text-gray-400" />,
  };

  const activityBgs = {
    call: 'bg-blue-100 dark:bg-blue-900/30',
    booking: 'bg-amber-100 dark:bg-amber-900/30',
    reservation: 'bg-indigo-100 dark:bg-indigo-900/30',
    user: 'bg-emerald-100 dark:bg-emerald-900/30',
    default: 'bg-gray-100 dark:bg-slate-700',
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center glass-surface-strong border border-[var(--glass-border)] p-6 sm:p-8 rounded-3xl shadow-[var(--shadow-md)]">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Dashboard</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Overview of your travel platform</p>
        </div>
        <Button variant="secondary" onClick={fetchDashboard} icon={<HiOutlineArrowPath className="w-4 h-4" />}>
          Refresh
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 gap-4"
      >
        {stats.map((stat, i) => {
          const colSpans = [
            "col-span-1 sm:col-span-2 xl:col-span-4",
            "col-span-1 sm:col-span-2 xl:col-span-4",
            "col-span-1 sm:col-span-2 xl:col-span-4",
            "col-span-1 sm:col-span-2 xl:col-span-3",
            "col-span-1 sm:col-span-2 xl:col-span-3",
            "col-span-1 sm:col-span-2 xl:col-span-6",
          ];
          return (
            <motion.div key={stat.label} variants={item} className={colSpans[i] || "col-span-1"}>
              <StatCard 
                label={stat.label} 
                value={stat.value} 
                icon={stat.icon} 
                iconBg={stat.bg} 
              />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Popular Cities & Hotels */}
        <div className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--color-border-primary)]">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <HiOutlineMapPin className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Popular Cities</h2>
              </div>
              <div className="space-y-3">
                {(data?.popular_cities || []).length === 0 && (
                  <p className="text-[var(--color-text-tertiary)] text-sm">No data available</p>
                )}
                {(data?.popular_cities || []).map((city, i) => (
                  <div key={city.name} className="flex items-center justify-between p-3 rounded-xl glass-interactive border border-[var(--glass-border)] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg glass-surface border border-[var(--glass-border)] shadow-sm flex items-center justify-center text-sm font-bold text-[var(--color-text-secondary)]">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{city.name}</span>
                    </div>
                    <Badge variant="info">{city.count} calls</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--color-border-primary)]">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <HiOutlineBuildingOffice2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Popular Hotels</h2>
              </div>
              <div className="space-y-3">
                {(data?.popular_hotels || []).length === 0 && (
                  <p className="text-[var(--color-text-tertiary)] text-sm">No data available</p>
                )}
                {(data?.popular_hotels || []).map((hotel, i) => (
                  <div key={hotel.name + i} className="flex items-center justify-between p-3 rounded-xl glass-interactive border border-[var(--glass-border)] transition-colors">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">{hotel.name}</p>
                      <p className="text-xs font-medium text-[var(--color-text-tertiary)]">{hotel.city}</p>
                    </div>
                    <Badge variant="success">{hotel.booking_count} bookings</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex flex-col h-full">
          <Card className="flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--color-border-primary)]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <HiOutlineClock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Recent Activity</h2>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {(data?.recent_activity || []).length === 0 && (
                <EmptyState title="No recent activity" description="Activity will appear here as users interact with the platform." />
              )}
              {(data?.recent_activity || []).map((act, i) => {
                const icon = activityIcons[act.type] || activityIcons.default;
                const bg = activityBgs[act.type] || activityBgs.default;
                return (
                  <div key={i} className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-1 pb-4 border-b border-[var(--color-border-primary)] border-dashed last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] leading-tight">{act.description}</p>
                      <p className="text-xs font-medium text-[var(--color-text-tertiary)] mt-1.5">{timeAgo(act.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
