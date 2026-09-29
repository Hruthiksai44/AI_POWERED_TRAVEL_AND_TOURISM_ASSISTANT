import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating orbs */}
      <motion.div animate={{ y: [0, -30, 0], x: [0, 20, 0] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute top-20 left-20 w-40 h-40 rounded-full bg-[var(--color-brand-500)]/5 blur-3xl" />
      <motion.div animate={{ y: [0, 20, 0], x: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 8, delay: 1 }} className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-[var(--color-brand-600)]/5 blur-3xl" />

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md relative z-10">
        <EmptyState
          icon={<HiOutlineMagnifyingGlass className="w-8 h-8" />}
          title="Page Not Found"
          description="The page you're looking for doesn't exist or has been moved."
          className="border-none shadow-none bg-transparent p-0"
        />
        
        <div className="text-center mt-2">
          <motion.p initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-[8rem] font-black leading-none bg-gradient-to-br from-[var(--color-brand-400)] to-[var(--color-brand-600)] bg-clip-text text-transparent opacity-20 dark:opacity-40 mb-6">
            404
          </motion.p>
          
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Link to="/">
              <Button size="lg" className="px-8">
                Go Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
