import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  FiMessageSquare,
  FiMic,
  FiCalendar,
  FiGlobe,
  FiArrowRight,
  FiStar,
  FiMapPin,
  FiZap,
  FiShield,
  FiHeart,
  FiChevronDown,
} from 'react-icons/fi';
import Navbar from '../../components/layout/Navbar';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] },
  }),
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ───────────── floating blobs for hero ───────────── */
const FloatingOrb = ({ className, delay = 0 }) => (
  <motion.div
    className={`absolute rounded-full blur-3xl opacity-30 pointer-events-none ${className}`}
    animate={{
      y: [0, -30, 0, 30, 0],
      x: [0, 20, 0, -20, 0],
      scale: [1, 1.1, 1, 0.95, 1],
    }}
    transition={{
      duration: 12,
      repeat: Infinity,
      ease: 'easeInOut',
      delay,
    }}
  />
);

/* ───────────── features data ───────────── */
const features = [
  {
    icon: FiMessageSquare,
    title: 'AI Travel Assistant',
    desc: 'Chat with our intelligent assistant to plan the perfect trip. Get personalized recommendations instantly.',
    color: 'from-indigo-500 to-violet-600',
  },
  {
    icon: FiMic,
    title: 'Voice Support',
    desc: 'Speak naturally and let our voice-enabled AI understand your travel needs in real-time.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: FiCalendar,
    title: 'Smart Booking',
    desc: 'Seamless itinerary generation and booking assistance powered by cutting-edge AI technology.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    icon: FiGlobe,
    title: 'Multi-language',
    desc: 'Travel the world without language barriers. Support for dozens of languages worldwide.',
    color: 'from-pink-500 to-rose-600',
  },
];

/* ───────────── destinations data ───────────── */
const destinations = [
  {
    city: 'Hyderabad',
    tag: 'Heritage & Tech Hub',
    rating: 4.8,
    gradient: 'from-violet-600/80 to-indigo-800/80',
    emoji: '🕌',
  },
  {
    city: 'Jaipur',
    tag: 'The Pink City',
    rating: 4.9,
    gradient: 'from-pink-600/80 to-rose-800/80',
    emoji: '🏰',
  },
  {
    city: 'Mumbai',
    tag: 'City of Dreams',
    rating: 4.7,
    gradient: 'from-amber-600/80 to-orange-800/80',
    emoji: '🌆',
  },
  {
    city: 'Varanasi',
    tag: 'Spiritual Capital',
    rating: 4.8,
    gradient: 'from-yellow-600/80 to-amber-800/80',
    emoji: '🛕',
  },
  {
    city: 'Goa',
    tag: 'Beach Paradise',
    rating: 4.9,
    gradient: 'from-cyan-600/80 to-teal-800/80',
    emoji: '🏖️',
  },
  {
    city: 'Delhi',
    tag: 'Capital Heritage',
    rating: 4.7,
    gradient: 'from-red-600/80 to-rose-800/80',
    emoji: '🏛️',
  },
];

/* ───────────── testimonials data ───────────── */
const testimonials = [
  {
    name: 'Arjun Mehta',
    role: 'Travel Blogger',
    text: 'This AI assistant planned a flawless 10-day Rajasthan tour. The voice feature made it feel like talking to a real travel expert!',
    avatar: '🧑‍💻',
    stars: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Solo Traveler',
    text: 'Multi-language support was a game-changer in South India. I felt confident navigating through every city on my own.',
    avatar: '👩‍🎨',
    stars: 5,
  },
  {
    name: 'David Chen',
    role: 'Business Traveler',
    text: 'Smart booking saved me hours. The AI found hidden gems in Mumbai that no guidebook mentioned. Absolutely brilliant!',
    avatar: '👨‍💼',
    stars: 5,
  },
];

/* ───────────── how-it-works steps ───────────── */
const steps = [
  {
    step: '01',
    title: 'Tell Us Your Dream',
    desc: 'Share your travel preferences, budget, and dates through text or voice.',
    icon: FiHeart,
  },
  {
    step: '02',
    title: 'AI Crafts Your Plan',
    desc: 'Our intelligent engine builds a personalized itinerary tailored just for you.',
    icon: FiZap,
  },
  {
    step: '03',
    title: 'Explore & Enjoy',
    desc: 'Get real-time guidance, bookings, and local recommendations on the go.',
    icon: FiMapPin,
  },
];

/* ═══════════════ MAIN COMPONENT ═══════════════ */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <Navbar />

      {/* ──── HERO ──── */}
      <section className="relative min-h-screen flex items-center justify-center gradient-hero overflow-hidden">
        {/* floating orbs */}
        <FloatingOrb className="w-96 h-96 bg-indigo-600 -top-20 -left-32" delay={0} />
        <FloatingOrb className="w-80 h-80 bg-violet-600 top-1/3 right-0" delay={2} />
        <FloatingOrb className="w-72 h-72 bg-amber-500 bottom-10 left-1/4" delay={4} />

        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <motion.div
          style={{ y: heroY }}
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        >
          {/* badge */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/10 text-sm mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            AI-Powered Travel Planning
          </motion.div>

          {/* heading */}
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight mb-6"
          >
            Your Journey,{' '}
            <span className="text-gradient">Reimagined</span>{' '}
            <br className="hidden sm:block" />
            by&nbsp;AI
          </motion.h1>

          {/* subtitle */}
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10"
          >
            Discover breathtaking destinations, craft perfect itineraries, and
            travel smarter — all with the power of artificial intelligence at your
            fingertips.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 text-lg px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Start Exploring <FiArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 text-lg px-8 py-3.5 rounded-xl font-semibold border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all duration-200 cursor-pointer"
            >
              Sign In
            </Link>
          </motion.div>

          {/* stats bar */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {[
              ['10K+', 'Happy Travelers'],
              ['50+', 'Destinations'],
              ['4.9★', 'User Rating'],
            ].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-gradient">{val}</p>
                <p className="text-xs md:text-sm text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400"
        >
          <FiChevronDown size={28} />
        </motion.div>
      </section>

      {/* ──── FEATURES ──── */}
      <section className="relative py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-indigo-400 font-semibold tracking-wide uppercase text-sm mb-3">
              Why Choose Us
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-4">
              Powerful <span className="text-gradient">Features</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-400 max-w-xl mx-auto">
              Everything you need for an unforgettable travel experience, powered by cutting-edge AI technology.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 dark:border-slate-700/50 p-6 group cursor-default"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}
                >
                  <f.icon size={26} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── POPULAR DESTINATIONS ──── */}
      <section className="relative py-28 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-amber-400 font-semibold tracking-wide uppercase text-sm mb-3">
              Explore India
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-4">
              Popular <span className="text-gradient">Destinations</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-400 max-w-xl mx-auto">
              From royal palaces to sun-kissed beaches — discover India's most
              captivating destinations.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.05 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {destinations.map((d) => (
              <motion.div
                key={d.city}
                variants={scaleIn}
                whileHover={{ scale: 1.03, transition: { duration: 0.3 } }}
                className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group"
              >
                {/* gradient background simulating image */}
                <div className={`absolute inset-0 bg-gradient-to-br ${d.gradient}`} />
                {/* animated shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {/* content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-6">
                  <span className="text-5xl">{d.emoji}</span>
                  <div>
                    <div className="flex items-center gap-1 text-amber-300 text-sm mb-1">
                      <FiStar className="fill-amber-300" size={14} />
                      {d.rating}
                    </div>
                    <h3 className="text-2xl font-bold">{d.city}</h3>
                    <p className="text-white/70 text-sm">{d.tag}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── HOW IT WORKS / AI SHOWCASE ──── */}
      <section className="relative py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-violet-400 font-semibold tracking-wide uppercase text-sm mb-3">
              How It Works
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-4">
              Meet Your AI <span className="text-gradient">Travel Companion</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-slate-400 max-w-2xl mx-auto">
              Our AI assistant combines natural language understanding, real-time data,
              and deep travel knowledge to give you a planning experience like no other.
            </motion.p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                variants={fadeInUp}
                custom={i}
                className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl p-8 text-center shadow-lg"
              >
                {/* step number */}
                <span className="text-6xl font-black text-gradient opacity-20 absolute top-4 right-6 select-none">
                  {s.step}
                </span>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/25">
                  <s.icon size={28} className="text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* AI chat preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-lg p-8 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm text-slate-400">AI Travel Assistant</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-indigo-600/30 border border-indigo-500/20 rounded-2xl rounded-br-md px-4 py-2.5 max-w-xs">
                  <p className="text-sm">Plan a 5-day trip to Rajasthan for 2 people 🏜️</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-sm">
                  <p className="text-sm text-slate-300">
                    Great choice! I'll create a personalized Rajasthan itinerary covering
                    Jaipur, Udaipur, and Jodhpur with the best hotels and experiences. ✨
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──── TESTIMONIALS ──── */}
      <section className="relative py-28 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeInUp} className="text-emerald-400 font-semibold tracking-wide uppercase text-sm mb-3">
              Testimonials
            </motion.p>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-4">
              Loved by <span className="text-gradient">Travelers</span>
            </motion.h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={scaleIn}
                whileHover={{ y: -6 }}
                className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-2xl shadow-lg p-6"
              >
                <div className="flex gap-1 text-amber-400 mb-4">
                  {[...Array(t.stars)].map((_, i) => (
                    <FiStar key={i} size={16} className="fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{t.avatar}</span>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ──── CTA FOOTER ──── */}
      <section className="relative py-28 px-6 overflow-hidden">
        <FloatingOrb className="w-96 h-96 bg-violet-600 -bottom-40 -right-40" delay={1} />
        <FloatingOrb className="w-72 h-72 bg-indigo-600 top-0 left-10" delay={3} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-gradient">Explore?</span>
          </h2>
          <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto">
            Join thousands of travelers who plan smarter, explore more, and create
            unforgettable memories with AI.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 text-lg px-10 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            Get Started Free <FiArrowRight />
          </Link>
        </motion.div>
      </section>

      {/* ──── FOOTER ──── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Travel &amp; Tourism Assistant. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
