'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  LinkIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  CubeIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

const navigationGroups = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    ]
  },
  {
    name: 'Clients',
    items: [
      { name: 'All Clients', href: '/dashboard/clients', icon: BuildingOfficeIcon },
      { name: 'Workflows', href: '/dashboard/workflows', icon: CubeIcon },
      { name: 'Billing', href: '/dashboard/billing', icon: CreditCardIcon },
    ]
  },
  {
    name: 'Products',
    items: [
      { name: 'Bill Negotiator', href: '/dashboard/bill-negotiator', icon: CurrencyDollarIcon },
    ]
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Reports', href: '/dashboard/reports', icon: ChartBarIcon },
      { name: 'Audit Log', href: '/dashboard/audit-log', icon: ClipboardDocumentListIcon },
    ]
  },
  {
    name: 'Configuration',
    items: [
      { name: 'Scheduling', href: '/dashboard/workflows/scheduling', icon: CalendarDaysIcon },
      { name: 'Integrations', href: '/dashboard/integrations', icon: LinkIcon },
      { name: 'Team', href: '/dashboard/team', icon: UserGroupIcon },
      { name: 'Security', href: '/dashboard/security', icon: ShieldCheckIcon },
      { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
    ]
  },
];

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated && data.user) {
          setUser({
            name: data.user.name || 'Admin User',
            email: data.user.email,
            role: data.user.role === 'super_admin' ? 'Super Admin' : 'Admin'
          });
        }
      })
      .catch(() => {});
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-soft-md"
      >
        <Bars3Icon className="w-6 h-6 text-primary" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-soft-lg z-50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close button - mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2"
        >
          <XMarkIcon className="w-6 h-6 text-gray-500" />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">DOKit</span>
            </div>
          </Link>
          <p className="text-xs text-gray-500 mt-2">Admin Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {navigationGroups.map((group) => (
            <div key={group.name}>
              <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {group.name}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
                  const active = isActive || isExactDashboard;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${active 
                          ? 'bg-primary text-white' 
                          : 'text-gray-700 hover:bg-cream hover:text-primary'
                        }
                      `}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-semibold">
              {user ? getInitials(user.name) : 'AD'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'Loading...'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role || 'Admin'}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 px-4 py-2 mt-2 text-sm text-gray-600 hover:text-red-600 transition-colors w-full"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
