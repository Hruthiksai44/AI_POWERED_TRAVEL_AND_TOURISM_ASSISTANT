import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineSignal, HiOutlineExclamationTriangle } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import useTwilioDevice from '../../hooks/useTwilioDevice';
import VoiceVisualizer from '../../components/voice/VoiceVisualizer';
import CallControls from '../../components/voice/CallControls';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';

const statusConfig = {
  offline: { label: 'Offline', variant: 'default', dot: false },
  connecting: { label: 'Connecting…', variant: 'warning', dot: true },
  ready: { label: 'Ready', variant: 'success', dot: false },
  ringing: { label: 'Ringing…', variant: 'info', dot: true },
  'in-call': { label: 'In Call', variant: 'success', dot: true },
  error: { label: 'Error', variant: 'error', dot: false },
};

export default function VoiceCall() {
  const { user } = useAuth();
  const {
    status,
    error,
    callSid,
    isMuted,
    deviceReady,
    initialize,
    connect,
    disconnect,
    toggleMute,
    ConnectionState,
  } = useTwilioDevice();

  const cfg = statusConfig[status] || statusConfig.offline;

  useEffect(() => {
    const init = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        await initialize();
      } catch (err) {
        toast.error('Microphone access is required for voice calls.');
      }
    };
    init();
  }, [initialize]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">Voice Assistant</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Speak with the AI Travel Assistant directly from your browser
          </p>
        </div>

        <div className="flex flex-col items-center gap-8 glass-panel p-6 sm:p-8 rounded-3xl w-full">
          <Badge variant={cfg.variant} dot={cfg.dot} className="px-3 py-1">
            {cfg.label}
          </Badge>

          <div className="text-center flex flex-col items-center">
            <Avatar size="xl" name={user?.name || '?'} className="mb-4 shadow-lg bg-[var(--color-brand-600)] text-white" />
            <p className="font-semibold text-[var(--color-text-primary)] text-lg">{user?.name}</p>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{user?.phone}</p>
          </div>

          <VoiceVisualizer status={status} />

          <AnimatePresence>
            {callSid && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full"
              >
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)] text-xs mt-2">
                  <HiOutlineSignal className="text-[var(--color-brand-500)] w-4 h-4 shrink-0" />
                  <span className="text-[var(--color-text-secondary)] truncate">
                    Call SID: <span className="font-mono font-medium text-[var(--color-text-primary)]">{callSid}</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full"
              >
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400 mt-2">
                  <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <CallControls 
            status={status}
            deviceReady={deviceReady}
            isMuted={isMuted}
            onCall={connect}
            onDisconnect={disconnect}
            onToggleMute={toggleMute}
          />
        </div>

        <div className="mt-8 text-center text-xs text-[var(--color-text-tertiary)] space-y-1">
          <p>Your voice is streamed to Twilio and processed by the AI assistant.</p>
          <p>You can book hotels, ask about cities, and plan trips — all by voice.</p>
        </div>
      </motion.div>
    </div>
  );
}
