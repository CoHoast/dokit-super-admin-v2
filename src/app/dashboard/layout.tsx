'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useClient } from '@/context/ClientContext';
import { filterNavigation, canAccess, getRoleDisplayName, demoUsers, UserRole } from '@/lib/permissions';

// Platform-level navigation (no client selected)
const platformNavigation = [
  {
    name: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { name: 'Processing Queue', href: '/dashboard/queue', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    ]
  },
  {
    name: 'Operations',
    items: [
      { name: 'Email Intake', href: '/dashboard/email-intake', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
      { name: 'Billing', href: '/dashboard/billing', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    ]
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Reports', href: '/dashboard/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { name: 'Audit Log', href: '/dashboard/audit-log', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ]
  },
  {
    name: 'Admin',
    items: [
      { name: 'Clients', href: '/dashboard/clients', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { name: 'Team', href: '/dashboard/team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { name: 'Security', href: '/dashboard/security', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
      { name: 'Settings', href: '/dashboard/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ]
  },
];

// Client-level navigation (client selected)
const clientNavigation = [
  {
    name: 'Client Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { name: 'Applications', href: '/dashboard/applications', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
    ]
  },
  {
    name: 'Workflows',
    items: [
      { name: 'Document Intake', href: '/dashboard/workflows/document-intake', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { name: 'Member Intake', href: '/dashboard/workflows/member-intake', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
      { name: 'Claims Adjudication', href: '/dashboard/workflows/claims-adjudication', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { name: 'Provider Bills', href: '/dashboard/workflows/provider-bills', icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z' },
      { name: 'Workers Comp', href: '/dashboard/workflows/workers-comp', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ]
  },
  {
    name: 'Analytics',
    items: [
      { name: 'Batches', href: '/dashboard/batches', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
      { name: 'Reports', href: '/dashboard/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { name: 'Audit Log', href: '/dashboard/audit-log', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ]
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, switchUser, isLoading: userLoading } = useUser();
  const { selectedClient, selectClient, clients, isLoading: clientLoading } = useClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  // Choose navigation based on whether a client is selected
  const navigationGroups = selectedClient ? clientNavigation : platformNavigation;

  // Filter navigation based on user role
  const filteredNavigation = user 
    ? filterNavigation(navigationGroups, user.role)
    : navigationGroups;

  // Redirect if user doesn't have access to current page
  useEffect(() => {
    if (!userLoading && user && !canAccess(user.role, pathname)) {
      const firstAccessiblePage = filteredNavigation[0]?.items[0]?.href || '/dashboard';
      router.push(firstAccessiblePage);
    }
  }, [pathname, user, userLoading, filteredNavigation, router]);

  // Loading state
  if (userLoading || clientLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ 
            width: 40, 
            height: 40, 
            border: '3px solid #e5e7eb', 
            borderTopColor: '#0a0f1a', 
            borderRadius: '50%', 
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #06b6d4)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>D</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0a0f1a' }}>DOKit</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <svg width="24" height="24" fill="none" stroke="#0a0f1a" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Sidebar Overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #2563eb, #06b6d4)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '20px' }}>D</span>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>DOKit</span>
            </div>
            <button 
              onClick={closeSidebar}
              style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
              className="mobile-close-btn"
            >
              <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <p>Admin Dashboard</p>
        </div>

        {/* Client Switcher */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div 
            onClick={() => setShowClientDropdown(!showClientDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: selectedClient ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              cursor: 'pointer',
              border: selectedClient ? '1px solid #00d4ff' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '6px',
                background: selectedClient ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="16" height="16" fill="none" stroke={selectedClient ? '#0a0f1a' : 'rgba(255,255,255,0.7)'} strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>
                  {selectedClient ? selectedClient.name : 'All Clients'}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                  {selectedClient ? 'Client View' : 'Platform View'}
                </div>
              </div>
            </div>
            <svg 
              width="16" 
              height="16" 
              fill="none" 
              stroke="rgba(255,255,255,0.6)" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
              style={{ 
                transform: showClientDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Client Dropdown */}
          {showClientDropdown && (
            <div style={{
              marginTop: '8px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}>
              {/* All Clients Option */}
              <button
                onClick={() => {
                  selectClient(null);
                  setShowClientDropdown(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: !selectedClient ? '#f0f9ff' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  background: !selectedClient ? '#00d4ff' : '#e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="14" height="14" fill="none" stroke={!selectedClient ? 'white' : '#6b7280'} strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a' }}>All Clients</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Platform overview</div>
                </div>
                {!selectedClient && (
                  <svg width="16" height="16" fill="none" stroke="#00d4ff" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Client List */}
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {clients.map(client => (
                  <button
                    key={client.id}
                    onClick={() => {
                      selectClient(client);
                      setShowClientDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: selectedClient?.id === client.id ? '#f0f9ff' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '6px',
                      background: selectedClient?.id === client.id ? '#00d4ff' : '#f3f4f6',
                      color: selectedClient?.id === client.id ? 'white' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      {client.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        {client.documentsThisMonth.toLocaleString()} docs this month
                      </div>
                    </div>
                    {client.status === 'onboarding' && (
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        background: '#fef3c7', 
                        color: '#92400e',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}>
                        Onboarding
                      </span>
                    )}
                    {selectedClient?.id === client.id && (
                      <svg width="16" height="16" fill="none" stroke="#00d4ff" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredNavigation.map((group) => (
            <div key={group.name}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'rgba(255,255,255,0.4)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                padding: '0 16px',
                marginBottom: '8px'
              }}>
                {group.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href} 
                      className={isActive ? 'active' : ''}
                      onClick={closeSidebar}
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d={item.icon} />
                      </svg>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        
        {/* User Section with Role Switcher */}
        <div className="sidebar-user">
          <div 
            className="sidebar-user-info" 
            style={{ cursor: 'pointer', position: 'relative' }}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="sidebar-avatar">{user?.initials || 'U'}</div>
            <div style={{ flex: 1 }}>
              <div className="sidebar-user-name">{user?.name || 'User'}</div>
              <div className="sidebar-user-role">{user ? getRoleDisplayName(user.role) : 'Loading...'}</div>
            </div>
            <svg 
              width="16" 
              height="16" 
              fill="none" 
              stroke="rgba(255,255,255,0.6)" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
              style={{ 
                transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              left: 16,
              right: 16,
              background: 'white',
              borderRadius: 8,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
              marginBottom: 8,
              overflow: 'hidden',
              zIndex: 100,
            }}>
              <div style={{ 
                padding: '12px 16px', 
                fontSize: 11, 
                fontWeight: 600, 
                color: '#9ca3af', 
                textTransform: 'uppercase',
                borderBottom: '1px solid #f3f4f6'
              }}>
                Switch User (Demo)
              </div>
              {Object.values(demoUsers).map((demoUser) => (
                <button
                  key={demoUser.email}
                  onClick={() => {
                    switchUser(demoUser.email);
                    setShowUserMenu(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: user?.email === demoUser.email ? '#f0f7ff' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: user?.email === demoUser.email ? '#0a0f1a' : '#e5e7eb',
                    color: user?.email === demoUser.email ? 'white' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {demoUser.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a' }}>
                      {demoUser.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {getRoleDisplayName(demoUser.role)}
                    </div>
                  </div>
                  {user?.email === demoUser.email && (
                    <svg 
                      width="16" 
                      height="16" 
                      fill="none" 
                      stroke="#0a0f1a" 
                      strokeWidth="2" 
                      viewBox="0 0 24 24"
                      style={{ marginLeft: 'auto' }}
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
          
          <Link href="/" onClick={closeSidebar} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', marginTop: '8px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '14px' }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign Out
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      <style jsx global>{`
        @media (max-width: 1024px) {
          .mobile-close-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
