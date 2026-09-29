import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', gender: user?.gender || 'other', age: user?.age || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { default: api } = await import('../../api/client');
      const res = await api.put('/users/me', form);
      updateProfile(res.data);
      toast.success('Profile updated successfully!');
    } catch { 
      toast.error('Failed to update profile'); 
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="text-3xl font-bold mb-8 text-[var(--color-text-primary)] tracking-tight">My Profile</h1>
        
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 pb-8 border-b border-[var(--color-border-primary)] text-center sm:text-left">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-brand-700)] flex items-center justify-center text-white text-4xl font-black shadow-lg shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{user?.name}</h2>
              <p className="text-[var(--color-text-secondary)] font-medium mt-1 mb-3">{user?.email}</p>
              <Badge variant="brand" className="uppercase tracking-wider font-bold">
                {user?.role || 'Customer'}
              </Badge>
            </div>
          </div>

          <div className="space-y-6">
            <Input 
              label="Full Name" 
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              placeholder="John Doe" 
            />
            
            <Input 
              label="Email Address" 
              value={user?.email || ''} 
              disabled 
              helpText="Email address cannot be changed."
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input 
                label="Phone Number" 
                value={form.phone} 
                onChange={e => setForm({ ...form, phone: e.target.value })} 
                placeholder="+1 (555) 000-0000" 
              />
              
              <Input 
                label="Age" 
                type="number" 
                value={form.age} 
                onChange={e => setForm({ ...form, age: parseInt(e.target.value) || '' })} 
                placeholder="25" 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[var(--color-text-primary)]">Gender</label>
              <select 
                value={form.gender} 
                onChange={e => setForm({ ...form, gender: e.target.value })} 
                className="w-full h-11 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] rounded-lg text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent transition-all"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div className="pt-4">
              <Button onClick={handleSave} loading={saving} fullWidth size="lg">
                Save Changes
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--color-border-primary)] text-xs font-medium text-[var(--color-text-tertiary)] text-center sm:text-left">
            <p>Account created on {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
