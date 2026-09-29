import { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineChartBar,
  HiOutlineArrowTrendingUp,
  HiOutlineCalendar,
  HiOutlineArrowPath,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { analyticsAPI } from '../../api/client';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from 'recharts';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const COLORS = [
  'var(--color-primary-500)', 
  'var(--color-accent-500)', 
  'var(--color-brand-400)', 
  'var(--color-brand-600)', 
  'var(--color-accent-600)', 
  'var(--color-primary-300)'
];

const CustomTooltip = memo(({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] shadow-[var(--shadow-lg)] p-3 rounded-xl text-sm z-50">
      <p className="font-bold text-[var(--color-text-primary)] mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-2 font-medium">
          <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
        </p>
      ))}
    </div>
  );
});

export default function Analytics() {
  const [dailyCalls, setDailyCalls] = useState([]);
  const [monthlyCalls, setMonthlyCalls] = useState([]);
  const [bookingTrends, setBookingTrends] = useState([]);
  const [conversionRates, setConversionRates] = useState([]);
  const [revenueByCity, setRevenueByCity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [daily, monthly, bookings, conversion, revenue] = await Promise.all([
        analyticsAPI.getDailyCalls(30),
        analyticsAPI.getMonthlyCalls(12),
        analyticsAPI.getBookingTrends(30),
        analyticsAPI.getConversionRates(30),
        analyticsAPI.getRevenueByCity(),
      ]);
      setDailyCalls(daily.data || []);
      setMonthlyCalls(monthly.data || []);
      setBookingTrends(bookings.data || []);
      setConversionRates(conversion.data || []);
      setRevenueByCity(revenue.data || []);
    } catch (err) {
      setError('Failed to load analytics');
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
        <Skeleton height="36px" width="200px" className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} height="350px" rounded="2xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20">
        <EmptyState 
          icon={<HiOutlineXCircle className="w-12 h-12 text-red-500" />}
          title="Failed to Load Analytics"
          description={error}
          action={{ label: 'Retry', onClick: fetchData, icon: <HiOutlineArrowPath className="w-4 h-4" /> }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Analytics</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Platform performance metrics and trends</p>
        </div>
        <Button variant="secondary" onClick={fetchData} icon={<HiOutlineArrowPath className="w-4 h-4" />}>
          Refresh
        </Button>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Calls */}
        <motion.div variants={item}>
          <Card className="h-full">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border-primary)]">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <HiOutlineCalendar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Daily Calls (30 days)</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyCalls} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-[var(--color-border-primary)] opacity-50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Calls" stroke="var(--color-primary-500)" strokeWidth={3} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Monthly Calls */}
        <motion.div variants={item}>
          <Card className="h-full">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border-primary)]">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <HiOutlineChartBar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Monthly Calls</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCalls} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-[var(--color-border-primary)] opacity-50" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Calls" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Booking Trends */}
        <motion.div variants={item}>
          <Card className="h-full">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border-primary)]">
              <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <HiOutlineArrowTrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Booking Trends</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bookingTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-[var(--color-border-primary)] opacity-50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="var(--color-primary-500)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="cancellations" name="Cancellations" stroke="var(--color-accent-500)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Conversion Rate */}
        <motion.div variants={item}>
          <Card className="h-full">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border-primary)]">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <HiOutlineArrowTrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Conversion Rate</h3>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conversionRates} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-[var(--color-border-primary)] opacity-50" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="rate" name="Rate (%)" stroke="var(--color-primary-500)" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Revenue by City */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-border-primary)]">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <HiOutlineChartBar className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[var(--color-text-primary)] text-lg">Revenue by City</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByCity} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-[var(--color-border-primary)] opacity-50" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="city" type="category" tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="revenue" name="Revenue (₹)" radius={[0, 4, 4, 0]} maxBarSize={30}>
                      {revenueByCity.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByCity}
                      dataKey="revenue"
                      nameKey="city"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      paddingAngle={3}
                      stroke="var(--color-bg-primary)"
                      strokeWidth={2}
                    >
                      {revenueByCity.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
