import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('adminSidebarCollapsed');
    return saved === 'true';
  });
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', collapsed);
  }, [collapsed]);
  
  // Optional: Auto collapse on smaller screens, but Sidebar is hidden on < md anyway
  // This logic is mostly for tablet sizes (md/lg)

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans relative overflow-hidden z-0">
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="env-mesh env-mesh-3 w-[800px] h-[800px] -top-32 -left-32 animate-float"></div>
        <div className="env-mesh env-mesh-2 w-[600px] h-[600px] bottom-0 right-0 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="env-mesh env-mesh-1 w-[500px] h-[500px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50 dark:opacity-30"></div>
      </div>
      
      <Navbar />
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-6rem)] mt-4 relative z-10">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
