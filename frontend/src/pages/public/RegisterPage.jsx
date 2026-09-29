import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineLockClosed,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineUserPlus,
  HiOutlineCalendar,
  HiOutlineGlobeAlt,
  HiOutlineTicket,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/layout/Navbar';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function RegisterPage() {
  const { register, verifyPhoneOtp, resendPhoneOtp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    gender: '',
    age: '',
    password: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpState, setOtpState] = useState('unverified');
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      toast.error('Please fill in all required fields');
      return false;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    if (form.age && Number(form.age) <= 0) {
      toast.error('Age must be a positive number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        ...(form.phoneNumber && { phone: form.phoneNumber }),
        ...(form.gender && { gender: form.gender }),
        ...(form.age && { age: Number(form.age) }),
      };
      await register(payload);
      toast.success('Account created! Please verify your phone number.');
      setOtpState('sent');
      setResendTimer(60);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(form.email, otpCode);
      toast.success('Phone verified successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    try {
      await resendPhoneOtp(form.email);
      toast.success('OTP resent!');
      setResendTimer(60);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to resend OTP');
    }
  };

  const passwordLength = form.password.length;
  const pwStrength = passwordLength >= 12 ? 'success' : passwordLength >= 8 ? 'warning' : 'error';
  const pwText = passwordLength >= 12 ? 'Strong' : passwordLength >= 8 ? 'Good' : 'Too short';
  const pwValue = Math.min(100, (passwordLength / 12) * 100);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <Navbar />

      {/* background */}
      <div className="fixed inset-0 bg-[var(--color-bg-primary)] -z-10" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="ambient-orb bg-[var(--color-brand-600)] w-[800px] h-[800px] -bottom-32 -left-32 opacity-20 dark:opacity-30"
          style={{ transform: 'translate3d(0,0,0)' }}
        />
        <div
          className="ambient-orb bg-amber-500 w-[600px] h-[600px] -top-32 right-0 opacity-10 dark:opacity-20"
          style={{ transform: 'translate3d(0,0,0)' }}
        />
      </div>

      {/* content */}
      <div className="relative flex min-h-[calc(100vh-4rem)]">
        
        {/* Left Side: Branding / Value Prop (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-center w-[45%] p-12 xl:p-20 z-10 relative">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <h1 className="text-5xl xl:text-6xl font-bold text-[var(--color-text-primary)] mb-6 leading-tight">
              Begin Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-brand-500)] to-amber-500">Journey</span>
            </h1>
            <p className="text-lg text-[var(--color-text-secondary)] max-w-md mb-10 leading-relaxed">
              Create an account to start exploring, booking, and experiencing the world with your personal AI travel assistant.
            </p>
            <div className="flex flex-col gap-4 max-w-sm">
              <div className="glass-surface p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-900)/30] flex items-center justify-center text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] shrink-0">
                  <HiOutlineGlobeAlt size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Discover Destinations</h3>
                </div>
              </div>
              <div className="glass-surface p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <HiOutlineTicket size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">Manage Bookings</h3>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10 overflow-y-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            className="w-full max-w-lg my-8"
          >
            <motion.div variants={fadeIn} custom={0}>
              <Card padding="default" className="glass-surface-strong">
                {/* header */}
                <motion.div variants={fadeIn} custom={1} className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl glass-interactive text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] flex items-center justify-center shadow-[var(--shadow-sm)]">
                    <HiOutlineUserPlus size={28} />
                  </div>
                  <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">Create Account</h1>
                  <p className="text-sm text-[var(--color-text-secondary)]">Start your travel adventure today</p>
                </motion.div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* name */}
                  <motion.div variants={fadeIn} custom={2}>
                    <Input
                      label="Full Name"
                      required
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      icon={<HiOutlineUser size={18} />}
                    />
                  </motion.div>

                  {/* email */}
                  <motion.div variants={fadeIn} custom={3}>
                    <Input
                      label="Email"
                      required
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      icon={<HiOutlineEnvelope size={18} />}
                      autoComplete="email"
                    />
                  </motion.div>

                  {/* phone */}
                  <motion.div variants={fadeIn} custom={4} className="flex flex-col gap-3">
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Input
                            label="Phone Number"
                            required
                            type="tel"
                            name="phoneNumber"
                            value={form.phoneNumber}
                            onChange={handleChange}
                            placeholder="+1 98765 43210"
                            icon={<HiOutlinePhone size={18} />}
                          />
                        </div>
                      </div>
                    
                    {otpState === 'sent' && (
                      <div className="glass-panel p-4 rounded-xl flex flex-col gap-3">
                        <div className="text-sm font-medium text-[var(--color-text-primary)]">
                          Verification code sent to {form.phoneNumber}
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Input
                              placeholder="_ _ _ _ _ _"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value)}
                              disabled={loading}
                            />
                          </div>
                          <div className="group relative">
                            <Button type="button" variant="primary" onClick={handleVerifyOtp} disabled={loading || otpCode.length !== 6} className="mb-[1px]">
                              Verify OTP
                            </Button>
                          </div>
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] flex justify-between mt-1">
                          <span>Didn't receive code?</span>
                          {resendTimer > 0 ? (
                            <span className="text-[var(--color-text-tertiary)] cursor-not-allowed">Resend in {resendTimer}s</span>
                          ) : (
                            <span onClick={handleResendOtp} className="text-[var(--color-brand-500)] cursor-pointer hover:underline">Resend OTP</span>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {/* gender & age — two columns */}
                  <motion.div variants={fadeIn} custom={5} className="grid grid-cols-2 gap-4">
                    {/* gender */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-text-primary)]">Gender</label>
                      <div className="relative">
                        <HiOutlineUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none" size={18} />
                        <select
                          name="gender"
                          value={form.gender}
                          onChange={handleChange}
                          className="w-full glass-surface text-[var(--color-text-primary)] border border-[var(--glass-border)] rounded-xl outline-none transition-all duration-200 focus:border-[var(--color-border-focus)] focus:ring-1 focus:ring-[var(--color-border-focus)] px-4 py-2 pl-10 appearance-none cursor-pointer text-sm"
                        >
                          <option value="">Select</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    {/* age */}
                    <div>
                      <Input
                        label="Age"
                        type="number"
                        name="age"
                        value={form.age}
                        onChange={handleChange}
                        placeholder="25"
                        min="1"
                        icon={<HiOutlineCalendar size={18} />}
                      />
                    </div>
                  </motion.div>

                  {/* password */}
                  <motion.div variants={fadeIn} custom={6} className="relative">
                    <Input
                      label="Password"
                      required
                      type={showPw ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 8 characters"
                      icon={<HiOutlineLockClosed size={18} />}
                      autoComplete="new-password"
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

                  {/* confirm password */}
                  <motion.div variants={fadeIn} custom={7} className="relative">
                    <Input
                      label="Confirm Password"
                      required
                      type={showCpw ? 'text' : 'password'}
                      name="confirmPassword"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      icon={<HiOutlineLockClosed size={18} />}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCpw(!showCpw)}
                      className="absolute right-3 top-[34px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showCpw ? <HiOutlineEyeSlash size={18} /> : <HiOutlineEye size={18} />}
                    </button>
                  </motion.div>

                  {/* password strength hint */}
                  {form.password && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex flex-col gap-1.5 pt-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-secondary)]">Password strength</span>
                        <span className={
                          pwStrength === 'success' ? 'text-emerald-500' :
                          pwStrength === 'warning' ? 'text-amber-500' : 'text-red-500'
                        }>{pwText}</span>
                      </div>
                      <ProgressBar value={pwValue} variant={pwStrength} className="h-1.5 rounded-full overflow-hidden" />
                    </motion.div>
                  )}

                  {/* submit */}
                  {otpState === 'unverified' && (
                    <motion.div variants={fadeIn} custom={8} className="pt-2">
                      <Button
                        type="submit"
                        loading={loading}
                        fullWidth
                        size="lg"
                        icon={<HiOutlineUserPlus size={18} />}
                      >
                        Create Account
                      </Button>
                    </motion.div>
                  )}
                </form>

                {/* login link */}
                <motion.p variants={fadeIn} custom={9} className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline transition-colors"
                  >
                    Sign in
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
