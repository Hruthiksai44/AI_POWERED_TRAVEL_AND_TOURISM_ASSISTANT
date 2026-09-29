import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineLockClosed } from 'react-icons/hi2';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating orbs */}
      <motion.div animate={{ y: [0, -20, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute top-32 right-32 w-48 h-48 rounded-full bg-red-500/5 blur-3xl" />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md relative z-10">
        <EmptyState
          icon={<HiOutlineLockClosed className="w-8 h-8 text-red-500" />}
          title="Access Denied"
          description="You don't have permission to view this page."
          className="border-none shadow-none bg-transparent p-0"
        />
        
        <div className="text-center mt-2">
          <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-[8rem] font-black leading-none bg-gradient-to-br from-red-400 to-red-600 bg-clip-text text-transparent opacity-20 dark:opacity-40 mb-6">
            403
          </motion.p>
          
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Link to="/dashboard">
              <Button size="lg" className="px-8" variant="primary">
                Go to Dashboard
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
