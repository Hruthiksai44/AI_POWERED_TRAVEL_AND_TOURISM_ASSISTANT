import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineEnvelope, HiOutlineKey, HiOutlineLockClosed, HiOutlineArrowLeft, HiOutlineCheck, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { authAPI } from '../../api/client';
import Navbar from '../../components/layout/Navbar';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const fadeIn = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0, transition: { duration: 0.3 } }),
};

export default function ForgotPasswordPage() {
  /* ──── state ──── */
  const [step, setStep] = useState(1); // 1 = request, 2 = reset, 3 = done
  const [direction, setDirection] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  /* ──── step 1: request reset ──── */
  const handleRequest = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.forgotPassword(email);
      const tkn = res?.data?.token || res?.data?.resetToken || '';
      if (tkn) {
        setToken(tkn);
        setSuccessMsg(`Reset token (dev): ${tkn}`);
      } else {
        setSuccessMsg('If this email exists, a reset link has been sent.');
      }
      toast.success('Reset request sent!');
      setDirection(1);
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  /* ──── step 2: reset password ──── */
  const handleReset = async (e) => {
    e.preventDefault();
    if (!token || !newPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword);
      toast.success('Password reset successfully! 🎉');
      setSuccessMsg('Your password has been updated. You can now sign in.');
      setStep(3); // show done
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <Navbar />

      {/* background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-brand-50)]/50 to-[var(--color-bg-primary)] dark:from-[var(--color-brand-950)]/20 dark:to-[var(--color-bg-primary)] -z-10" />
      <motion.div
        className="fixed w-[450px] h-[450px] bg-[var(--color-brand-500)]/10 rounded-full blur-[120px] top-20 -left-32 pointer-events-none"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="fixed w-[350px] h-[350px] bg-[var(--color-brand-600)]/5 rounded-full blur-[100px] bottom-10 right-0 pointer-events-none"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* content */}
      <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
        <motion.div
          initial="hidden"
          animate="visible"
          className="w-full max-w-md"
        >
          <motion.div variants={fadeIn} custom={0}>
            <Card padding="default" className="backdrop-blur-md bg-[var(--color-bg-primary)]/80 overflow-hidden">
              {/* header */}
              <motion.div variants={fadeIn} custom={1} className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-900)] text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] flex items-center justify-center shadow-[var(--shadow-sm)]">
                  <HiOutlineKey size={28} />
                </div>
                <h1 className="text-3xl font-bold mb-1 text-[var(--color-text-primary)]">
                  {step === 3 ? 'All Done!' : 'Reset Password'}
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {step === 1 && "Enter your email and we'll help you reset your password"}
                  {step === 2 && 'Enter the token and your new password'}
                  {step === 3 && 'Your password has been updated'}
                </p>
              </motion.div>

              {/* progress dots */}
              <div className="flex justify-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      s <= step ? 'w-8 bg-[var(--color-brand-600)] dark:bg-[var(--color-brand-500)]' : 'w-4 bg-[var(--color-bg-tertiary)]'
                    }`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait" custom={direction}>
                {/* ──── STEP 1: Email ──── */}
                {step === 1 && (
                  <motion.form
                    key="step1"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={direction}
                    onSubmit={handleRequest}
                    className="space-y-5"
                  >
                    <Input
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      icon={<HiOutlineEnvelope size={18} />}
                      autoComplete="email"
                    />

                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      size="lg"
                      iconRight={<HiOutlineEnvelope size={16} />}
                    >
                      Send Reset Token
                    </Button>
                  </motion.form>
                )}

                {/* ──── STEP 2: Token + New Password ──── */}
                {step === 2 && (
                  <motion.form
                    key="step2"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={direction}
                    onSubmit={handleReset}
                    className="space-y-5"
                  >
                    {/* success / token display */}
                    {successMsg && (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-sm text-emerald-800 dark:text-emerald-300 break-all">
                        {successMsg}
                      </div>
                    )}

                    {/* token */}
                    <Input
                      label="Reset Token"
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste your reset token"
                      icon={<HiOutlineKey size={18} />}
                    />

                    {/* new password */}
                    <div className="relative">
                      <Input
                        label="New Password"
                        type={showPw ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
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
                    </div>

                    {/* confirm password */}
                    <div className="relative">
                      <Input
                        label="Confirm Password"
                        type={showCpw ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                    </div>

                    <Button
                      type="submit"
                      loading={loading}
                      fullWidth
                      size="lg"
                      iconRight={<HiOutlineLockClosed size={16} />}
                    >
                      Reset Password
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setDirection(-1);
                        setStep(1);
                      }}
                      className="w-full text-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <HiOutlineArrowLeft size={14} /> Back to email
                    </button>
                  </motion.form>
                )}

                {/* ──── STEP 3: Done ──── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    custom={direction}
                    className="text-center space-y-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                      className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-[var(--shadow-sm)]"
                    >
                      <HiOutlineCheck size={36} />
                    </motion.div>
                    <p className="text-[var(--color-text-secondary)]">{successMsg}</p>
                    
                    <Link to="/login" className="inline-block w-full">
                      <Button fullWidth size="lg">Go to Login</Button>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* footer link */}
              {step !== 3 && (
                <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
                  Remember your password?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] hover:underline transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
