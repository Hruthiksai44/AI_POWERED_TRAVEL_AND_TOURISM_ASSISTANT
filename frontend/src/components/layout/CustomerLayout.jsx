import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { cn } from '../../utils/cn';

export default function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans relative overflow-hidden z-0">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="env-mesh env-mesh-1 w-[800px] h-[800px] -top-32 -left-32 animate-float"></div>
        <div className="env-mesh env-mesh-4 w-[600px] h-[600px] bottom-0 right-0 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="env-mesh env-mesh-2 w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 dark:opacity-30"></div>
      </div>
      
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <Outlet />
      </main>
      <footer className="glass-surface border-x-0 border-b-0 border-t border-[var(--glass-border)] py-12 mt-auto relative z-10 rounded-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-600)] flex items-center justify-center text-white shrink-0 shadow-[var(--shadow-sm)]">
                  <span className="text-lg">✈</span>
                </div>
                <span className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">TravelBot</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Your AI-powered travel companion. Explore, plan, and book with ease using advanced conversational intelligence.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">Quick Links</h4>
              <nav className="flex flex-col gap-2.5 text-sm">
                <a href="/cities" className="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-400)] transition-colors">Explore Cities</a>
                <a href="/assistant" className="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-400)] transition-colors">AI Assistant</a>
                <a href="/bookings" className="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-400)] transition-colors">My Bookings</a>
              </nav>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-[var(--color-text-primary)]">Support</h4>
              <div className="flex flex-col gap-2.5 text-sm text-[var(--color-text-secondary)]">
                <p>Languages: English, Hindi, Telugu</p>
                <p>24/7 AI Assistant Available</p>
                <a href="/feedback" className="hover:text-[var(--color-brand-600)] dark:hover:text-[var(--color-brand-400)] transition-colors">Provide Feedback</a>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-[var(--color-border-primary)] flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[var(--color-text-tertiary)]">
            <p>© {new Date().getFullYear()} TravelBot. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[var(--color-text-primary)] transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
