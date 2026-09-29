import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { 
  HiOutlineSquares2X2, 
  HiOutlineMapPin, 
  HiOutlineBuildingOffice2, 
  HiOutlineSquare3Stack3D, 
  HiOutlineClipboardDocumentList, 
  HiOutlineCircleStack, 
  HiOutlineDocumentText, 
  HiOutlineStar, 
  HiOutlineChartBar, 
  HiOutlineUsers, 
  HiOutlineCog6Tooth,
  HiOutlinePhone,
  HiOutlineChevronRight,
  HiOutlineChevronLeft
} from 'react-icons/hi2';

const adminNavGroups = [
  {
    title: 'Overview',
    links: [
      { to: '/admin', icon: HiOutlineSquares2X2, label: 'Dashboard', end: true },
      { to: '/admin/analytics', icon: HiOutlineChartBar, label: 'Analytics' },
    ]
  },
  {
    title: 'Content',
    links: [
      { to: '/admin/cities', icon: HiOutlineMapPin, label: 'Cities' },
      { to: '/admin/hotels', icon: HiOutlineBuildingOffice2, label: 'Hotels' },
      { to: '/admin/inventory', icon: HiOutlineSquare3Stack3D, label: 'Inventory' },
    ]
  },
  {
    title: 'Operations',
    links: [
      { to: '/admin/reservations', icon: HiOutlineClipboardDocumentList, label: 'Reservations' },
      { to: '/admin/feedback', icon: HiOutlineStar, label: 'Feedback' },
      { to: '/admin/call-logs', icon: HiOutlinePhone, label: 'Call Logs' },
    ]
  },
  {
    title: 'Knowledge Base',
    links: [
      { to: '/admin/knowledge-base', icon: HiOutlineCircleStack, label: 'Vectors & Data' },
      { to: '/admin/documents', icon: HiOutlineDocumentText, label: 'Documents' },
    ]
  },
  {
    title: 'Platform',
    links: [
      { to: '/admin/users', icon: HiOutlineUsers, label: 'Users' },
      { to: '/admin/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
    ]
  }
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside 
      className={cn(
        "hidden md:flex flex-col h-[calc(100vh-8.5rem)] ml-4 lg:ml-8 rounded-3xl glass-shell transition-all duration-300 relative group shrink-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-6 bg-[var(--color-bg-primary)] border border-[var(--color-border-primary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-secondary)] rounded-full p-1 shadow-[var(--shadow-sm)] z-10 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 outline-none"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <HiOutlineChevronRight className="w-4 h-4" /> : <HiOutlineChevronLeft className="w-4 h-4" />}
      </button>

      <div className="flex-1 overflow-y-auto hide-scrollbar py-6">
        <div className="flex flex-col gap-6">
          {adminNavGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="flex flex-col">
              {!collapsed && (
                <h3 className="px-6 mb-2 text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  {group.title}
                </h3>
              )}
              {collapsed && (
                <div className="w-8 mx-auto mb-2 h-px bg-[var(--color-border-primary)]" />
              )}
              
              <nav className="flex flex-col gap-1 px-3">
                {group.links.map(({ to, icon: Icon, label, end }) => {
                  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
                  
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]",
                        isActive 
                          ? "glass-control active text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]" 
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:glass-control"
                      )}
                    >
                      <Icon className={cn(
                        "w-5 h-5 shrink-0 transition-colors",
                        isActive ? "text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]" : "text-[var(--color-text-tertiary)]"
                      )} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
