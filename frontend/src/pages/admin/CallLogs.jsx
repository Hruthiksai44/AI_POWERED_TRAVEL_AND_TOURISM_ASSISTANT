import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { adminAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import Table from '../../components/ui/Table';
import { HiOutlinePhone } from 'react-icons/hi2';

const verdictColors = { 
  successful: 'success', 
  unsuccessful: 'error', 
  pending: 'warning' 
};

export default function CallLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    adminAPI.getCallLogs().then(r => setLogs(r.data)).catch(console.error).finally(() => setLoading(false)); 
  }, []);

  if (loading) return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <Skeleton height="36px" width="200px" className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Skeleton height="100px" rounded="2xl" />
        <Skeleton height="100px" rounded="2xl" />
        <Skeleton height="100px" rounded="2xl" />
      </div>
      <Skeleton height="400px" rounded="2xl" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Call Logs</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Review Voice SDK interactions</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Calls', value: logs.length, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Successful', value: logs.filter(l => l.verdict === 'successful').length, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Bookings Made', value: logs.filter(l => l.booking_made).length, color: 'text-amber-600 dark:text-amber-400' },
        ].map(s => (
          <Card key={s.label} padding="compact">
            <p className="text-sm font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table 
          columns={[
            {
              key: 'duration',
              label: 'Duration',
              render: (_, log) => (
                <span className="text-sm font-mono text-[var(--color-text-secondary)]">
                  {log.duration_seconds ? `${Math.floor(log.duration_seconds / 60)}:${String(log.duration_seconds % 60).padStart(2, '0')}` : '-'}
                </span>
              )
            },
            {
              key: 'summary',
              label: 'Summary',
              render: (summary) => (
                <span className="text-sm text-[var(--color-text-primary)] max-w-[300px] truncate block">
                  {summary || '-'}
                </span>
              )
            },
            {
              key: 'verdict',
              label: 'Verdict',
              render: (verdict) => (
                <Badge variant={verdictColors[verdict] || 'info'} className="uppercase">
                  {verdict || 'Unknown'}
                </Badge>
              )
            },
            {
              key: 'booking_made',
              label: 'Booking',
              render: (booking_made) => (
                booking_made ? <Badge variant="success">Yes</Badge> : <span className="text-sm font-medium text-[var(--color-text-tertiary)]">No</span>
              )
            },
            {
              key: 'language',
              label: 'Language',
              render: (lang) => (
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                  {({ en: '🇬🇧 EN', hi: '🇮🇳 HI', te: '🇮🇳 TE' })[lang] || lang}
                </span>
              )
            },
            {
              key: 'created_at',
              label: 'Date',
              render: (date) => (
                <span className="text-sm font-medium text-[var(--color-text-tertiary)] whitespace-nowrap">
                  {date ? new Date(date).toLocaleString() : '-'}
                </span>
              )
            }
          ]}
          data={logs}
          loading={loading}
          emptyState={
            <EmptyState 
              icon={<HiOutlinePhone className="w-10 h-10" />}
              title="No call logs"
              description="There are no voice call records yet."
            />
          }
        />
      </motion.div>
    </div>
  );
}
