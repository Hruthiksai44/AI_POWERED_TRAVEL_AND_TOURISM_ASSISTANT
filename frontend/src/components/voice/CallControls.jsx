import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlinePhone, HiOutlinePhoneXMark, HiOutlineMicrophone, HiOutlineSpeakerXMark } from 'react-icons/hi2';

export default function CallControls({ status, deviceReady, isMuted, onCall, onDisconnect, onToggleMute }) {
  const isInCall = status === 'in-call';
  const isRinging = status === 'ringing';
  const canCall = deviceReady || isInCall || isRinging;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Call Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isInCall || isRinging ? onDisconnect : onCall}
        disabled={!canCall}
        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
          !canCall
            ? 'opacity-50 cursor-not-allowed bg-gray-300 dark:bg-slate-700 shadow-none'
            : isInCall || isRinging
              ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30 hover:shadow-red-500/50 focus:ring-red-500/50'
              : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30 hover:shadow-emerald-500/50 focus:ring-emerald-500/50'
        }`}
        title={isInCall || isRinging ? "End Call" : "Start Call"}
      >
        {isInCall || isRinging ? (
          <HiOutlinePhoneXMark className="w-8 h-8 text-white" />
        ) : (
          <HiOutlinePhone className="w-8 h-8 text-white" />
        )}
      </motion.button>

      <p className="text-xs text-[var(--color-text-tertiary)] font-medium">
        {isInCall
          ? 'Tap to end call'
          : isRinging
            ? 'Connecting to assistant…'
            : deviceReady
              ? 'Tap to start call'
              : 'Initializing device…'}
      </p>

      {/* Mute Button */}
      <AnimatePresence>
        {isInCall && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-4 mt-2"
          >
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onToggleMute}
              className={`p-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                isMuted
                  ? 'bg-red-100 dark:bg-red-950/40 text-red-500 ring-1 ring-red-200 dark:ring-red-800'
                  : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-primary)]'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <HiOutlineSpeakerXMark className="w-6 h-6" />
              ) : (
                <HiOutlineMicrophone className="w-6 h-6" />
              )}
            </motion.button>
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {isMuted ? 'Muted' : 'Microphone on'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
