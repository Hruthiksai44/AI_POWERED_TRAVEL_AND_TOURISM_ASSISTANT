import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass, HiOutlineUsers, HiOutlinePhone } from 'react-icons/hi2';
import { adminAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [callingUserId, setCallingUserId] = useState(null);

  const handleCallUser = async (user) => {
    try {
      setCallingUserId(user.id);
      await adminAPI.callUser(user.id);
      alert(`Call initiated to ${user.name}`);
    } catch (error) {
      alert(`Failed to initiate call: ${error.response?.data?.detail || error.message}`);
    } finally {
      setCallingUserId(null);
    }
  };

  useEffect(() => { 
    adminAPI.getUsers().then(r => setUsers(r.data)).catch(console.error).finally(() => setLoading(false)); 
  }, []);

  const filtered = users.filter(u => 
    !search || 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (_, u) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
            {u.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="font-bold text-[var(--color-text-primary)]">{u.name}</span>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (_, u) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--color-text-primary)]">{u.email}</span>
          <span className="text-xs font-medium text-[var(--color-text-tertiary)]">{u.phone || 'No phone number'}</span>
        </div>
      )
    },
    {
      key: 'role',
      label: 'Role',
      render: (_, u) => (
        <Badge variant={u.role === 'admin' ? 'brand' : 'default'} className="uppercase">
          {u.role || 'Customer'}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, u) => (
        <Badge variant={u.is_active ? 'success' : 'error'}>
          {u.is_active ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: 'Joined Date',
      render: (_, u) => (
        <span className="text-sm font-medium text-[var(--color-text-tertiary)]">
          {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_, u) => (
        <div className="flex justify-end pr-2">
          {u.phone ? (
            <div className="group relative">
              <Button 
                size="sm" 
                variant="secondary" 
                icon={<HiOutlinePhone className="w-4 h-4" />} 
                onClick={() => handleCallUser(u)}
                disabled={callingUserId === u.id}
              >
                {callingUserId === u.id ? 'Calling...' : 'Call'}
              </Button>
            </div>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">User Management</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage system access and roles</p>
        </div>
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] px-4 py-2 rounded-lg">
          <span className="font-bold text-[var(--color-text-primary)]">{users.length}</span>
          <span className="text-sm text-[var(--color-text-secondary)] ml-2">Total Users</span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Input 
          icon={<HiOutlineMagnifyingGlass className="w-5 h-5 text-[var(--color-text-tertiary)]" />} 
          placeholder="Search users by name or email..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table 
          columns={columns} 
          data={filtered} 
          loading={loading}
          emptyState={
            <EmptyState 
              icon={<HiOutlineUsers className="w-10 h-10" />}
              title="No users found"
              description={search ? "Try adjusting your search query." : "No users exist in the system yet."}
            />
          }
        />
      </motion.div>
    </div>
  );
}
