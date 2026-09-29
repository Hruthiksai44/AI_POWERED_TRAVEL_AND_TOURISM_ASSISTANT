import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlineMapPin,
  HiOutlineArrowPath,
  HiOutlineXCircle,
  HiOutlinePhoto,
  HiOutlineGift,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { citiesAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

const emptyCity = { name: '', state: '', country: '', description: '', best_time_to_visit: '', language: '', currency: '' };
const emptyAttraction = { name: '', description: '', type: '', entry_fee: '', timing: '' };
const emptyFood = { name: '', description: '', type: '', where_to_find: '', price_range: '' };

export default function CityManagement() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [form, setForm] = useState(emptyCity);
  const [saving, setSaving] = useState(false);

  const [showAttrModal, setShowAttrModal] = useState(false);
  const [attrForm, setAttrForm] = useState(emptyAttraction);
  const [editingAttr, setEditingAttr] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [foodForm, setFoodForm] = useState(emptyFood);
  const [editingFood, setEditingFood] = useState(null);

  const fetchCities = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await citiesAPI.getAll();
      setCities(res.data || []);
    } catch {
      setError('Failed to load cities');
      toast.error('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCities(); }, []);

  const filtered = cities.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.state?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAdd = () => { setSelectedCity(null); setForm(emptyCity); setShowModal(true); };
  const openEdit = (city) => {
    setSelectedCity(city);
    setForm({ name: city.name, state: city.state, country: city.country, description: city.description, best_time_to_visit: city.best_time_to_visit, language: city.language, currency: city.currency });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('City name is required'); return; }
    try {
      setSaving(true);
      if (selectedCity) {
        await citiesAPI.update(selectedCity.id, form);
        toast.success('City updated successfully');
      } else {
        await citiesAPI.create(form);
        toast.success('City created successfully');
      }
      setShowModal(false);
      fetchCities();
    } catch {
      toast.error('Failed to save city');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this city? This cannot be undone.')) return;
    try {
      await citiesAPI.delete(id);
      toast.success('City deleted');
      fetchCities();
    } catch {
      toast.error('Failed to delete city');
    }
  };

  const openAddAttraction = () => { setEditingAttr(null); setAttrForm(emptyAttraction); setShowAttrModal(true); };
  const openEditAttraction = (attr) => { setEditingAttr(attr); setAttrForm({ name: attr.name, description: attr.description, type: attr.type, entry_fee: attr.entry_fee, timing: attr.timing }); setShowAttrModal(true); };
  const saveAttraction = async () => {
    if (!attrForm.name.trim()) { toast.error('Name required'); return; }
    try {
      if (editingAttr) {
        await citiesAPI.updateAttraction(editingAttr.id, attrForm);
        toast.success('Attraction updated');
      } else {
        await citiesAPI.addAttraction(selectedCity.id, attrForm);
        toast.success('Attraction added');
      }
      setShowAttrModal(false);
      fetchCities();
    } catch { toast.error('Failed to save attraction'); }
  };
  const deleteAttraction = async (id) => {
    if (!confirm('Delete this attraction?')) return;
    try { await citiesAPI.deleteAttraction(id); toast.success('Deleted'); fetchCities(); } catch { toast.error('Failed'); }
  };

  const openAddFood = () => { setEditingFood(null); setFoodForm(emptyFood); setShowFoodModal(true); };
  const openEditFood = (food) => { setEditingFood(food); setFoodForm({ name: food.name, description: food.description, type: food.type, where_to_find: food.where_to_find, price_range: food.price_range }); setShowFoodModal(true); };
  const saveFood = async () => {
    if (!foodForm.name.trim()) { toast.error('Name required'); return; }
    try {
      if (editingFood) {
        await citiesAPI.updateFood(editingFood.id, foodForm);
        toast.success('Food updated');
      } else {
        await citiesAPI.addFood(selectedCity.id, foodForm);
        toast.success('Food added');
      }
      setShowFoodModal(false);
      fetchCities();
    } catch { toast.error('Failed to save food'); }
  };
  const deleteFood = async (id) => {
    if (!confirm('Delete this food item?')) return;
    try { await citiesAPI.deleteFood(id); toast.success('Deleted'); fetchCities(); } catch { toast.error('Failed'); }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-end">
          <div><Skeleton height="36px" width="250px" className="mb-2" /><Skeleton height="20px" width="150px" /></div>
          <Skeleton height="40px" width="120px" rounded="lg" />
        </div>
        <Skeleton height="40px" width="300px" rounded="lg" className="mb-2" />
        <Skeleton height="500px" rounded="2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20">
        <EmptyState 
          icon={<HiOutlineXCircle className="w-12 h-12 text-red-500" />}
          title="Failed to Load Cities"
          description={error}
          action={{ label: 'Retry', onClick: fetchCities, icon: <HiOutlineArrowPath className="w-4 h-4" /> }}
        />
      </div>
    );
  }



  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">City Management</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">{cities.length} cities configured</p>
        </div>
        <Button onClick={openAdd} icon={<HiOutlinePlus className="w-5 h-5" />}>Add City</Button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Input 
          icon={<HiOutlineMagnifyingGlass size={20} />}
          placeholder="Search cities by name, state or country..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Table
          columns={[
            {
              key: 'name',
              label: 'City Name',
              render: (_, city) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-600)] dark:bg-[var(--color-brand-900)/30] dark:text-[var(--color-brand-400)] flex items-center justify-center shrink-0">
                    <HiOutlineMapPin className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[var(--color-text-primary)]">{city.name}</span>
                </div>
              )
            },
            {
              key: 'location',
              label: 'Location',
              render: (_, city) => (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{city.state}</span>
                  <span className="text-xs font-medium text-[var(--color-text-tertiary)]">{city.country}</span>
                </div>
              )
            },
            {
              key: 'best_time_to_visit',
              label: 'Best Time',
              render: (time) => <span className="text-sm font-medium text-[var(--color-text-secondary)]">{time || '-'}</span>
            },
            {
              key: 'stats',
              label: 'Stats',
              render: (_, city) => (
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="gap-1"><HiOutlinePhoto className="w-3 h-3" /> {city.attractions?.length || 0}</Badge>
                  <Badge variant="warning" className="gap-1"><HiOutlineGift className="w-3 h-3" /> {city.foods?.length || 0}</Badge>
                </div>
              )
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, city) => (
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(city)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Edit">
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(city.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              )
            }
          ]}
          data={filtered}
          emptyState={<EmptyState icon={<HiOutlineMapPin className="w-8 h-8" />} title="No cities found" description="Try adjusting your search query." />}
        />
      </motion.div>

      {/* City Modal */}
      <Modal 
        open={showModal} 
        onClose={() => setShowModal(false)} 
        title={selectedCity ? 'Edit City Configuration' : 'Add New City'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{saving ? 'Saving...' : 'Save City'}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <Input label="City Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mumbai" />
          <Input label="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="e.g. Maharashtra" />
          <Input label="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="e.g. India" />
          <Input label="Best Time to Visit" value={form.best_time_to_visit} onChange={e => setForm({ ...form, best_time_to_visit: e.target.value })} placeholder="e.g. Oct-Mar" />
          <Input label="Language" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} placeholder="e.g. Marathi, Hindi" />
          <Input label="Currency" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} placeholder="e.g. INR" />
        </div>
        
        <div className="space-y-1.5 mb-8">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Description</label>
          <textarea 
            value={form.description} 
            onChange={e => setForm({ ...form, description: e.target.value })} 
            rows={3} 
            className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all resize-none" 
            placeholder="A short description of the city..." 
          />
        </div>

        {selectedCity && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pt-6 border-t border-[var(--color-border-primary)]">
            {/* Attractions Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2"><HiOutlinePhoto className="w-5 h-5 text-indigo-500" /> Attractions</h4>
                <Button size="sm" variant="secondary" onClick={openAddAttraction} icon={<HiOutlinePlus className="w-3 h-3" />}>Add</Button>
              </div>
              <div className="space-y-3">
                {(selectedCity.attractions || []).map(attr => (
                  <div key={attr.id} className="flex items-start justify-between p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                    <div className="pr-2">
                      <p className="font-bold text-sm text-[var(--color-text-primary)]">{attr.name}</p>
                      <p className="text-xs font-medium text-[var(--color-text-tertiary)] mt-0.5">{attr.type}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditAttraction(attr)} className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteAttraction(attr.id)} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {(selectedCity.attractions || []).length === 0 && (
                  <p className="text-xs text-[var(--color-text-tertiary)] italic p-4 text-center border border-dashed border-[var(--color-border-primary)] rounded-xl">No attractions added.</p>
                )}
              </div>
            </div>

            {/* Foods Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[var(--color-text-primary)] flex items-center gap-2"><HiOutlineGift className="w-5 h-5 text-orange-500" /> Local Foods</h4>
                <Button size="sm" variant="secondary" onClick={openAddFood} icon={<HiOutlinePlus className="w-3 h-3" />}>Add</Button>
              </div>
              <div className="space-y-3">
                {(selectedCity.foods || []).map(food => (
                  <div key={food.id} className="flex items-start justify-between p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]">
                    <div className="pr-2">
                      <p className="font-bold text-sm text-[var(--color-text-primary)]">{food.name}</p>
                      <p className="text-xs font-medium text-[var(--color-text-tertiary)] mt-0.5">{food.type} • {food.price_range}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditFood(food)} className="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"><HiOutlinePencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteFood(food.id)} className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><HiOutlineTrash className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {(selectedCity.foods || []).length === 0 && (
                  <p className="text-xs text-[var(--color-text-tertiary)] italic p-4 text-center border border-dashed border-[var(--color-border-primary)] rounded-xl">No local foods added.</p>
                )}
              </div>
            </div>
          </div>
        )}

      </Modal>

      {/* Attraction Modal */}
      <Modal 
        open={showAttrModal} 
        onClose={() => setShowAttrModal(false)} 
        title={editingAttr ? 'Edit Attraction' : 'Add Attraction'}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setShowAttrModal(false)}>Cancel</Button>
            <Button onClick={saveAttraction}>Save Attraction</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <Input label="Name" value={attrForm.name} onChange={e => setAttrForm({ ...attrForm, name: e.target.value })} />
          <Input label="Type" value={attrForm.type} onChange={e => setAttrForm({ ...attrForm, type: e.target.value })} placeholder="e.g. Monument, Temple" />
          <Input label="Entry Fee" value={attrForm.entry_fee} onChange={e => setAttrForm({ ...attrForm, entry_fee: e.target.value })} />
          <Input label="Timing" value={attrForm.timing} onChange={e => setAttrForm({ ...attrForm, timing: e.target.value })} placeholder="e.g. 9AM-5PM" />
        </div>
        <div className="space-y-1.5 mb-8">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Description</label>
          <textarea value={attrForm.description} onChange={e => setAttrForm({ ...attrForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all resize-none" />
        </div>
      </Modal>

      {/* Food Modal */}
      <Modal 
        open={showFoodModal} 
        onClose={() => setShowFoodModal(false)} 
        title={editingFood ? 'Edit Food' : 'Add Food'}
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => setShowFoodModal(false)}>Cancel</Button>
            <Button onClick={saveFood}>Save Food</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          <Input label="Name" value={foodForm.name} onChange={e => setFoodForm({ ...foodForm, name: e.target.value })} />
          <Input label="Type" value={foodForm.type} onChange={e => setFoodForm({ ...foodForm, type: e.target.value })} placeholder="e.g. Street Food, Sweet" />
          <Input label="Where to Find" value={foodForm.where_to_find} onChange={e => setFoodForm({ ...foodForm, where_to_find: e.target.value })} />
          <Input label="Price Range" value={foodForm.price_range} onChange={e => setFoodForm({ ...foodForm, price_range: e.target.value })} placeholder="e.g. ₹50-200" />
        </div>
        <div className="space-y-1.5 mb-8">
          <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Description</label>
          <textarea value={foodForm.description} onChange={e => setFoodForm({ ...foodForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all resize-none" />
        </div>
      </Modal>
    </div>
  );
}
