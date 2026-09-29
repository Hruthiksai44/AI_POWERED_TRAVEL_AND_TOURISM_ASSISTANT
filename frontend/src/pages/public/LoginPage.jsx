import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineArrowRightOnRectangle, HiOutlineEye, HiOutlineEyeSlash, HiOutlineGlobeAlt, HiOutlineTicket } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      if (err?.response?.status === 403 && err?.response?.data?.detail === "Phone number not verified") {
        toast.error("Phone number not verified. Please register again to verify your phone.");
      } else {
        toast.error(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <Navbar />

      {/* background */}
      <div className="fixed inset-0 bg-[var(--color-bg-primary)] -z-10" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="ambient-orb bg-[var(--color-brand-600)] w-[800px] h-[800px] -top-64 -left-64 opacity-20 dark:opacity-30"
          style={{ transform: 'translate3d(0,0,0)' }}
        />
        <div
          className="ambient-orb bg-violet-600 w-[600px] h-[600px] bottom-0 right-0 opacity-10 dark:opacity-20"
          style={{ transform: 'translate3d(0,0,0)' }}
        />
      </div>

      {/* content */}
      <div className="relative flex min-h-[calc(100vh-4rem)]">
        
        {/* Left Side: Branding / Value Prop (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-center w-1/2 p-16 xl:p-24 z-10 relative">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <h1 className="text-5xl xl:text-6xl font-bold text-[var(--color-text-primary)] mb-6 leading-tight">
              Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-500)] to-violet-500">Premium</span><br />
              Travel Experience
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-md mb-10 leading-relaxed">
              Explore the world's most beautiful destinations with our AI-powered travel assistant. Plan, book, and experience seamlessly.
            </p>
            <div className="flex gap-4 max-w-md">
              <div className="glass-surface p-5 rounded-2xl flex-1 flex flex-col gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)/30] flex items-center justify-center text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">
                  <HiOutlineGlobeAlt size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Smart AI</h3>
                  <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Personalized recommendations</p>
                </div>
              </div>
              <div className="glass-surface p-5 rounded-2xl flex-1 flex flex-col gap-3">
                <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <HiOutlineTicket size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)]">Easy Booking</h3>
                  <p className="text-sm text-[var(--color-text-tertiary)] mt-1">One-click reservations</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-16 z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            className="w-full max-w-md"
          >
            <motion.div variants={fadeIn} custom={0}>
              <Card padding="default" className="glass-surface-strong">
                {/* header */}
                <motion.div variants={fadeIn} custom={1} className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-interactive text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] flex items-center justify-center shadow-[var(--shadow-sm)]">
                    <HiOutlineArrowRightOnRectangle size={28} />
                  </div>
                  <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">Welcome Back</h1>
                  <p className="text-sm text-[var(--color-text-secondary)]">Sign in to continue your journey</p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* email */}
                  <motion.div variants={fadeIn} custom={2}>
                    <Input
                      label="Email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      icon={<HiOutlineEnvelope size={18} />}
                      autoComplete="email"
                    />
                  </motion.div>

                  {/* password */}
                  <motion.div variants={fadeIn} custom={3} className="relative">
                    <Input
                      label="Password"
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      icon={<HiOutlineLockClosed size={18} />}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-[34px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPw ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                    </button>
                  </motion.div>

                  {/* forgot password link */}
                  <motion.div variants={fadeIn} custom={4} className="text-right">
                    <Link
                      to="/forgot-password"
                      className="text-sm text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </motion.div>

                  {/* submit */}
                  <motion.div variants={fadeIn} custom={5}>
                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      size="lg"
                      icon={<HiOutlineArrowRightOnRectangle size={18} />}
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </form>

                {/* divider */}
                <motion.div variants={fadeIn} custom={6} className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-[var(--glass-border)]" />
                  <span className="text-xs text-[var(--color-text-tertiary)]">OR</span>
                  <div className="flex-1 h-px bg-[var(--glass-border)]" />
                </motion.div>

                {/* register link */}
                <motion.p variants={fadeIn} custom={7} className="text-center text-sm text-[var(--color-text-secondary)]">
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline transition-colors"
                  >
                    Create one
                  </Link>
                </motion.p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
