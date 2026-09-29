import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { inventoryAPI, hotelsAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { HiOutlineCalendarDays, HiOutlineCheckCircle } from 'react-icons/hi2';

export default function InventoryManagement() {
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bulkForm, setBulkForm] = useState({ room_type_id: '', start_date: '', end_date: '', total_rooms: 10 });

  useEffect(() => { 
    hotelsAPI.getAll().then(r => setHotels(r.data)).catch(console.error).finally(() => setLoading(false)); 
  }, []);

  const loadHotel = async (id) => {
    const res = await hotelsAPI.getById(id);
    setSelectedHotel(res.data);
    if (res.data.room_types?.length) {
      setBulkForm(f => ({ ...f, room_type_id: res.data.room_types[0].id }));
      loadInventory(res.data.room_types[0].id);
    } else {
      setInventory([]);
    }
  };

  const loadInventory = async (rtId) => {
    const today = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    try {
      const res = await inventoryAPI.getByRoomType(rtId, today, end);
      setInventory(res.data);
    } catch { 
      setInventory([]); 
    }
  };

  const handleBulkCreate = async () => {
    if (!bulkForm.room_type_id || !bulkForm.start_date || !bulkForm.end_date) return toast.error('Fill all fields');
    setCreating(true);
    try {
      await inventoryAPI.bulkCreate(bulkForm);
      toast.success('Inventory created successfully!');
      loadInventory(bulkForm.room_type_id);
    } catch (e) { 
      toast.error(e.response?.data?.detail || 'Error creating inventory'); 
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <Skeleton height="36px" width="300px" className="mb-4" />
      <Skeleton height="100px" rounded="xl" className="mb-6" />
      <Skeleton height="400px" rounded="2xl" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Inventory Management</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Manage room availability across properties</p>
      </motion.div>

      {/* Hotel Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-[var(--color-text-primary)] mb-1.5">Select Property to Manage</label>
              <select 
                onChange={e => e.target.value && loadHotel(e.target.value)} 
                className="w-full h-11 px-4 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] rounded-xl text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all"
              >
                <option value="">Choose a hotel...</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            {selectedHotel && (
              <div className="sm:mt-6 shrink-0">
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[var(--color-text-primary)]">{selectedHotel.room_types?.length || 0}</span> Room Types Available
                </p>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {selectedHotel && (
        <>
          {/* Bulk Create */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-5">Generate Bulk Inventory</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5 xl:col-span-2">
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Room Type</label>
                  <select 
                    value={bulkForm.room_type_id} 
                    onChange={e => { setBulkForm({ ...bulkForm, room_type_id: e.target.value }); loadInventory(e.target.value); }} 
                    className="w-full h-11 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all"
                  >
                    {(selectedHotel.room_types || []).map(rt => <option key={rt.id} value={rt.id}>{rt.name} ({rt.category})</option>)}
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Start Date</label>
                  <input 
                    type="date" 
                    value={bulkForm.start_date} 
                    onChange={e => setBulkForm({ ...bulkForm, start_date: e.target.value })} 
                    className="w-full h-11 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all" 
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)]">End Date</label>
                  <input 
                    type="date" 
                    value={bulkForm.end_date} 
                    onChange={e => setBulkForm({ ...bulkForm, end_date: e.target.value })} 
                    className="w-full h-11 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all" 
                  />
                </div>
                
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Total Rooms</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={bulkForm.total_rooms} 
                      onChange={e => setBulkForm({ ...bulkForm, total_rooms: parseInt(e.target.value) || 0 })} 
                      className="w-full min-w-[80px] h-11 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm font-medium text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all" 
                      min={1} 
                    />
                    <Button onClick={handleBulkCreate} loading={creating} icon={<HiOutlineCheckCircle className="w-4 h-4" />}>
                      Create
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Inventory Grid */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card padding="none" className="overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]">
                <h2 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Current Inventory <span className="font-medium text-[var(--color-text-tertiary)] normal-case ml-2">(Next 30 Days)</span></h2>
              </div>
              
              {inventory.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-px bg-[var(--color-border-primary)] border-b border-[var(--color-border-primary)]">
                  {inventory.map(inv => {
                    const pct = inv.total_rooms > 0 ? ((inv.total_rooms - inv.booked_rooms) / inv.total_rooms) * 100 : 0;
                    
                    let statusClass = 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                    let badgeClass = 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
                    
                    if (pct > 60) {
                      statusClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                      badgeClass = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400';
                    } else if (pct > 20) {
                      statusClass = 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
                      badgeClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400';
                    }

                    return (
                      <div key={inv.id} className={`p-4 flex flex-col items-center justify-center text-center bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors`}>
                        <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase mb-2">
                          {new Date(inv.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${statusClass}`}>
                          <p className="text-xl font-black">{inv.available_rooms}</p>
                        </div>
                        
                        <p className="text-xs font-medium text-[var(--color-text-tertiary)] mb-2">of {inv.total_rooms} total</p>
                        
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${badgeClass}`}>
                          {pct > 60 ? 'High' : pct > 20 ? 'Low' : 'Sold Out'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12">
                  <EmptyState 
                    icon={<HiOutlineCalendarDays className="w-10 h-10" />}
                    title="No inventory generated"
                    description="Use the form above to generate inventory slots for this room type."
                  />
                </div>
              )}
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
