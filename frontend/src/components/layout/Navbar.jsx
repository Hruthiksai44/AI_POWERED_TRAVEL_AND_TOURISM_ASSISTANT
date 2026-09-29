import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  HiOutlineSun, 
  HiOutlineMoon, 
  HiOutlineBars3, 
  HiOutlineXMark, 
  HiOutlinePhone,
  HiOutlineUser,
  HiOutlineArrowRightOnRectangle,
  HiOutlineMagnifyingGlass
} from 'react-icons/hi2';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

export default function Navbar() {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = isAuthenticated
    ? isAdmin
      ? [
          { to: '/admin', label: 'Dashboard' }
        ]
      : [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/cities', label: 'Explore' },
          { to: '/assistant', label: 'AI Assistant' },
          { to: '/voice-call', label: 'Voice', icon: <HiOutlinePhone className="w-4 h-4" /> },
          { to: '/bookings', label: 'Bookings' }
        ]
    : [
        { href: '#features', label: 'Features' },
        { href: '#cities', label: 'Destinations' }
      ];

  return (
    <nav className="sticky top-4 mx-4 md:mx-6 lg:mx-8 z-40 glass-shell rounded-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-xl py-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-600)] flex items-center justify-center shadow-[var(--shadow-sm)] shrink-0">
              <span className="text-white text-lg leading-none">✈</span>
            </div>
            <span className="text-xl font-bold text-[var(--color-text-primary)] hidden sm:block tracking-tight">TravelBot</span>
          </NavLink>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link, idx) => 
              link.to ? (
                <NavLink 
                  key={idx}
                  to={link.to} 
                  className={({ isActive }) => cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] flex items-center gap-1.5",
                    isActive 
                      ? "glass-control active text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]" 
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:glass-control"
                  )}
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              ) : (
                <a 
                  key={idx}
                  href={link.href} 
                  className="px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
                >
                  {link.label}
                </a>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass-control text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-all text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] group"
              aria-label="Search command palette"
            >
              <HiOutlineMagnifyingGlass className="w-4 h-4 group-hover:text-[var(--color-text-primary)] transition-colors" />
              <span>Search...</span>
              <kbd className="hidden lg:inline-block font-sans text-xs px-1.5 py-0.5 rounded border border-[var(--glass-border)] bg-transparent">⌘K</kbd>
            </button>

            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-xl text-[var(--color-text-secondary)] glass-control hover:text-[var(--color-text-primary)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] shrink-0" 
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <HiOutlineSun className="w-5 h-5 text-amber-400" /> : <HiOutlineMoon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <div className="hidden md:flex items-center relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-full glass-control transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]"
                >
                  <Avatar name={user?.name} size="sm" />
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[120px]">
                    {user?.name}
                  </span>
                </button>
                
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full right-0 mt-2 w-48 glass-panel rounded-xl py-1 z-50 origin-top-right"
                    >
                      <div className="px-4 py-2.5 border-b border-[var(--glass-border)] mb-1">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user?.name}</p>
                        <p className="text-xs text-[var(--color-text-tertiary)] truncate">{user?.email}</p>
                      </div>
                      
                      <NavLink 
                        to="/profile" 
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:glass-control transition-colors"
                      >
                        <HiOutlineUser className="w-4 h-4" />
                        Profile Settings
                      </NavLink>
                      
                      <button 
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }} 
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1 border-t border-[var(--color-border-primary)]"
                      >
                        <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>Sign up</Button>
              </div>
            )}

            <button 
              onClick={() => setMobileOpen(!mobileOpen)} 
              className="md:hidden p-2 rounded-xl text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] shrink-0"
              aria-expanded={mobileOpen}
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <HiOutlineXMark className="w-6 h-6" /> : <HiOutlineBars3 className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden overflow-hidden bg-[var(--color-bg-primary)] border-t border-[var(--color-border-primary)] shadow-[var(--shadow-md)]"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link, idx) => 
                link.to ? (
                  <NavLink 
                    key={idx}
                    to={link.to} 
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => cn(
                      "block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2",
                      isActive 
                        ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-900)] dark:text-[var(--color-brand-200)]" 
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </NavLink>
                ) : (
                  <a 
                    key={idx}
                    href={link.href} 
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    {link.label}
                  </a>
                )
              )}
              
              {isAuthenticated ? (
                <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)] flex flex-col gap-1">
                  <div className="px-4 py-2 mb-2 flex items-center gap-3">
                    <Avatar name={user?.name} size="md" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{user?.name}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{user?.email}</p>
                    </div>
                  </div>
                  <NavLink 
                    to="/profile" 
                    onClick={() => setMobileOpen(false)} 
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <HiOutlineUser className="w-4 h-4" />
                    Profile Settings
                  </NavLink>
                  <button 
                    onClick={() => { handleLogout(); setMobileOpen(false); }} 
                    className="w-full flex items-center gap-2 text-left px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  <Button variant="secondary" fullWidth onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                    Log in
                  </Button>
                  <Button variant="primary" fullWidth onClick={() => { navigate('/register'); setMobileOpen(false); }}>
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
