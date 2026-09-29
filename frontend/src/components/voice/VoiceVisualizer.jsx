import { motion } from 'framer-motion';

export default function VoiceVisualizer({ status }) {
  // Determine animation states based on Twilio connection status
  const isConnecting = status === 'connecting' || status === 'ringing';
  const isInCall = status === 'in-call';

  // We use 5 bars for the visualizer
  const bars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-end justify-center gap-1.5 h-16 w-32 mx-auto overflow-hidden">
      {bars.map((bar, i) => {
        let animationProps = { height: '8px' }; // Default offline/ready state
        let transitionProps = { duration: 2, repeat: Infinity, ease: 'easeInOut' };

        if (isInCall) {
          // Simulate active voice modulation with randomized keyframes
          const scales = [
            Math.random() * 20 + 10,
            Math.random() * 40 + 20,
            Math.random() * 20 + 10,
          ];
          animationProps = { height: scales.map(s => `${s}px`) };
          transitionProps = { 
            duration: Math.random() * 0.5 + 0.3, 
            repeat: Infinity, 
            repeatType: 'mirror', 
            ease: 'easeInOut',
            delay: i * 0.1 
          };
        } else if (isConnecting) {
          // Sine wave sweeping effect
          animationProps = { height: ['8px', '32px', '8px'] };
          transitionProps = { 
            duration: 1, 
            repeat: Infinity, 
            ease: 'easeInOut',
            delay: i * 0.15 
          };
        }

        return (
          <motion.div
            key={i}
            className={`w-3 rounded-full ${isInCall ? 'bg-emerald-500' : isConnecting ? 'bg-amber-400' : 'bg-gray-300 dark:bg-slate-600'}`}
            animate={animationProps}
            transition={transitionProps}
          />
        );
      })}
    </div>
  );
}
