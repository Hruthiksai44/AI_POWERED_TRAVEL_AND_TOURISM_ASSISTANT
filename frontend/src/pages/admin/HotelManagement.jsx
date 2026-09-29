import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineMagnifyingGlass, HiOutlineXMark, HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { hotelsAPI, citiesAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import { cn } from '../../utils/cn';

export default function HotelManagement() {
  const [hotels, setHotels] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editHotel, setEditHotel] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  
  const initialForm = { name: '', city_id: '', description: '', address: '', rating: 4, amenities: '', contact_phone: '', contact_email: '', check_in_time: '14:00', check_out_time: '12:00' };
  const [form, setForm] = useState(initialForm);

  const fetchData = () => {
    Promise.all([hotelsAPI.getAll(), citiesAPI.getAll()])
      .then(([h, c]) => { 
        setHotels(h.data); 
        setCities(c.data); 
        if (!form.city_id && c.data.length > 0) {
          setForm(prev => ({ ...prev, city_id: c.data[0].id }));
        }
      })
      .catch(console.error).finally(() => setLoading(false));
  };
  
  useEffect(fetchData, []);

  const openAdd = () => { 
    setEditHotel(null); 
    setForm({ ...initialForm, city_id: cities[0]?.id || '' }); 
    setShowModal(true); 
  };
  
  const openEdit = (h) => { 
    setEditHotel(h); 
    setForm({ 
      name: h.name, 
      city_id: h.city_id, 
      description: h.description || '', 
      address: h.address || '', 
      rating: h.rating, 
      amenities: (h.amenities || []).join(', '), 
      contact_phone: h.contact_phone || '', 
      contact_email: h.contact_email || '', 
      check_in_time: h.check_in_time || '14:00', 
      check_out_time: h.check_out_time || '12:00' 
    }); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    if (!form.name || !form.city_id) return toast.error('Name and City are required');
    setSaving(true);
    const data = { 
      ...form, 
      amenities: form.amenities ? form.amenities.split(',').map(a => a.trim()).filter(Boolean) : [], 
      rating: parseFloat(form.rating) 
    };
    try {
      if (editHotel) { 
        await hotelsAPI.update(editHotel.id, data); 
        toast.success('Hotel updated successfully'); 
      } else { 
        await hotelsAPI.create(data); 
        toast.success('Hotel created successfully'); 
      }
      setShowModal(false); 
      fetchData();
    } catch (e) { 
      toast.error(e.response?.data?.detail || 'Error saving hotel'); 
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this hotel? This action cannot be undone.')) return;
    try { 
      await hotelsAPI.delete(id); 
      toast.success('Hotel deleted'); 
      fetchData(); 
    } catch { 
      toast.error('Error deleting hotel'); 
    }
  };

  const filtered = hotels.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <Skeleton height="36px" width="250px" />
        <Skeleton height="40px" width="120px" rounded="lg" />
      </div>
      <Skeleton height="40px" width="300px" rounded="lg" className="mb-2" />
      <Skeleton height="500px" rounded="2xl" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">Hotel Management</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">{hotels.length} hotels in catalog</p>
        </div>
        <Button onClick={openAdd} icon={<HiOutlinePlus className="w-5 h-5" />}>Add Hotel</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Input 
          icon={<HiOutlineMagnifyingGlass size={20} />}
          placeholder="Search hotels by name..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table 
          columns={[
            {
              key: 'name',
              label: 'Hotel Name',
              render: (_, h) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <HiOutlineBuildingOffice2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[var(--color-text-primary)]">{h.name}</span>
                </div>
              )
            },
            {
              key: 'city_id',
              label: 'City',
              render: (id) => (
                <Badge variant="default">{cities.find(c => c.id === id)?.name || id}</Badge>
              )
            },
            {
              key: 'rating',
              label: 'Rating',
              render: (rating) => (
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-amber-500">★</span> 
                  <span className="text-[var(--color-text-primary)]">{rating.toFixed(1)}</span>
                </div>
              )
            },
            {
              key: 'address',
              label: 'Address',
              render: (addr) => (
                <span className="text-sm font-medium text-[var(--color-text-secondary)] block max-w-xs truncate">
                  {addr || '-'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, h) => (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(h)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Edit">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(h.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              )
            }
          ]}
          data={filtered}
          loading={loading}
          emptyState={
            <EmptyState 
              icon={<HiOutlineBuildingOffice2 className="w-10 h-10" />}
              title="No hotels found"
              description={search ? "Try adjusting your search query." : "Add a hotel to get started."}
            />
          }
        />
      </motion.div>

      {/* Modal */}
      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)}
        title={editHotel ? 'Edit Hotel' : 'Add Hotel'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{saving ? 'Saving...' : 'Save Hotel'}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <Input label="Hotel Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Taj Mahal Palace" />
          
          <div className="space-y-1.5 flex flex-col justify-end">
            <Dropdown
              label="City"
              options={cities.map(c => ({ value: c.id, label: c.name }))}
              value={form.city_id}
              onChange={val => setForm({ ...form, city_id: val })}
              searchable
              placeholder="Select City"
            />
          </div>
        </div>

        <div className="space-y-1.5 mb-5">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Description</label>
          <textarea 
            value={form.description} 
            onChange={e => setForm({ ...form, description: e.target.value })} 
            rows={3} 
            className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all resize-none" 
            placeholder="Describe the hotel..." 
          />
        </div>

        <div className="mb-5">
          <Input label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <Input type="number" label="Rating (1-5)" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} step="0.1" min="1" max="5" />
          <Input label="Amenities" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} placeholder="WiFi, Pool, Spa (comma separated)" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <Input label="Contact Phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+91..." />
          <Input label="Contact Email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="contact@hotel.com" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-2">
          <Input label="Check-in Time" value={form.check_in_time} onChange={e => setForm({ ...form, check_in_time: e.target.value })} placeholder="14:00" />
          <Input label="Check-out Time" value={form.check_out_time} onChange={e => setForm({ ...form, check_out_time: e.target.value })} placeholder="12:00" />
        </div>
      </Modal>
    </div>
  );
}
