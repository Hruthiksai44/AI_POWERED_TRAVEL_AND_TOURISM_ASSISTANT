import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineTicket } from 'react-icons/hi2';
import { reservationsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Dropdown from '../../components/ui/Dropdown';
import EmptyState from '../../components/ui/EmptyState';

const statusColors = { 
  confirmed: 'success', 
  cancelled: 'error', 
  modified: 'warning', 
  pending: 'info', 
  completed: 'success' 
};

export default function ReservationManagement() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    reservationsAPI.getAll({ status_filter: statusFilter || undefined, search: search || undefined })
      .then(r => setReservations(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = reservations.filter(r =>
    !search || r.booking_id?.toLowerCase().includes(search.toLowerCase()) || r.hotel_name?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'booking_id',
      label: 'Booking ID',
      render: (id) => (
        <div className="flex items-center gap-2">
          <HiOutlineTicket className="w-4 h-4 text-[var(--color-text-tertiary)]" />
          <span className="font-mono text-sm font-bold text-[var(--color-brand-600)]">{id}</span>
        </div>
      )
    },
    {
      key: 'hotel_name',
      label: 'Hotel',
      render: (_, r) => (
        <div className="flex flex-col">
          <span className="font-bold text-[var(--color-text-primary)]">{r.hotel_name}</span>
          <span className="text-xs font-medium text-[var(--color-text-tertiary)]">{r.city_name}</span>
        </div>
      )
    },
    {
      key: 'dates',
      label: 'Stay Dates',
      render: (_, r) => (
        <span className="text-sm font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
          {r.check_in_date} <span className="text-[var(--color-text-tertiary)] mx-1">→</span> {r.check_out_date}
        </span>
      )
    },
    {
      key: 'num_rooms',
      label: 'Rooms',
      render: (num) => (
        <span className="text-sm font-bold bg-[var(--color-bg-secondary)] px-2 py-1 rounded border border-[var(--color-border-primary)]">
          {num}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <Badge variant={statusColors[status] || 'info'} className="uppercase">
          {status || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'total_price',
      label: 'Price',
      render: (price) => (
        <span className="font-black text-[var(--color-text-primary)]">₹{price}</span>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Reservations</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage all system bookings</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input 
            icon={<HiOutlineMagnifyingGlass className="w-5 h-5 text-[var(--color-text-tertiary)]" />} 
            placeholder="Search by booking ID or hotel name..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="md:w-64 shrink-0 z-10">
          <Dropdown
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'modified', label: 'Modified' },
              { value: 'pending', label: 'Pending' }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table 
          columns={columns} 
          data={filtered} 
          loading={loading}
          emptyState={
            <EmptyState 
              icon={<HiOutlineTicket className="w-10 h-10" />}
              title="No reservations found"
              description="Try adjusting your search or filters."
            />
          }
        />
      </motion.div>
    </div>
  );
}
