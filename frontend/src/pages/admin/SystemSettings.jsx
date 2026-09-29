import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { adminAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function SystemSettings() {
  const [settings, setSettings] = useState({ 
    groq_model: 'llama-3.3-70b-versatile', 
    groq_api_key: '', 
    supported_languages: ['en', 'hi', 'te'], 
    max_upload_size: 10, 
    debug_mode: true 
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getSettings()
      .then(r => setSettings(s => ({ ...s, ...r.data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { 
      await adminAPI.updateSettings(settings); 
      toast.success('Settings saved successfully'); 
    } catch { 
      toast.error('Failed to save settings'); 
    } finally { 
      setSaving(false); 
    }
  };

  const toggleLanguage = (lang) => {
    const langs = settings.supported_languages?.includes(lang) 
      ? (settings.supported_languages || []).filter(l => l !== lang)
      : [...(settings.supported_languages || []), lang];
    setSettings({ ...settings, supported_languages: langs });
  };

  if (loading) return null; // Let the layout shell handle the suspense

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">System Settings</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Configure global application parameters</p>
      </motion.div>

      <div className="space-y-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text-primary)]">
              <span className="text-xl">🤖</span> AI Configuration
            </h2>
            <div className="space-y-5">
              <Input 
                label="Primary AI Model"
                value={settings.groq_model} 
                onChange={e => setSettings({ ...settings, groq_model: e.target.value })} 
                helpText="The default LLM used for the conversational agent."
              />
              <Input 
                label="Groq API Key"
                type="password" 
                value={settings.groq_api_key} 
                onChange={e => setSettings({ ...settings, groq_api_key: e.target.value })} 
                placeholder="••••••••••••••••••••••••"
                helpText="Leave blank to use the environment variable."
              />
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text-primary)]">
              <span className="text-xl">🌐</span> Language Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'en', label: 'English', flag: '🇬🇧' },
                { id: 'hi', label: 'Hindi', flag: '🇮🇳' },
                { id: 'te', label: 'Telugu', flag: '🇮🇳' }
              ].map(({ id, label, flag }) => {
                const isActive = settings.supported_languages?.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleLanguage(id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                      isActive 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                        : 'border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      isActive 
                        ? 'bg-indigo-500 border-indigo-500 text-white' 
                        : 'bg-[var(--color-bg-primary)] border-[var(--color-border-primary)]'
                    }`}>
                      {isActive && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xl">{flag}</span>
                    <span className={`font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-[var(--color-text-primary)]'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-[var(--color-text-primary)]">
              <span className="text-xl">⚙️</span> Application Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input 
                label="Max Upload Size (MB)"
                type="number" 
                value={settings.max_upload_size} 
                onChange={e => setSettings({ ...settings, max_upload_size: parseInt(e.target.value) || 10 })}
                min={1}
                max={50}
              />
              
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--color-text-primary)]">System Mode</label>
                <div className="h-11 flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        checked={settings.debug_mode} 
                        onChange={e => setSettings({ ...settings, debug_mode: e.target.checked })} 
                        className="sr-only" 
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors ${
                        settings.debug_mode ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-600'
                      }`} />
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                        settings.debug_mode ? 'transform translate-x-6' : ''
                      }`} />
                    </div>
                    <span className={`text-sm font-bold ${
                      settings.debug_mode ? 'text-amber-600 dark:text-amber-500' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {settings.debug_mode ? 'Debug Mode Active' : 'Production Mode'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="pt-4">
          <Button onClick={handleSave} loading={saving} fullWidth size="lg">
            {saving ? 'Saving Configuration...' : 'Save All Settings'}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
