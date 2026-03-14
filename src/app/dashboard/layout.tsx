'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Sirkl Bill Negotiator navigation
const navigation = [
  { name: 'Dashboard', href: '/dashboard/bill-negotiator' },
  { name: 'Bills', href: '/dashboard/bill-negotiator/bills' },
  { name: 'Review Queue', href: '/dashboard/bill-negotiator/review' },
  { name: 'Upload', href: '/dashboard/bill-negotiator/upload' },
  { name: 'Analytics', href: '/dashboard/bill-negotiator/analytics' },
  { name: 'Reports', href: '/dashboard/bill-negotiator/reports' },
  { name: 'Settings', href: '/dashboard/bill-negotiator/settings' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      {/* Sidebar - Always visible */}
      <aside style={{
        width: '256px',
        minWidth: '256px',
        backgroundColor: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid #334155',
        }}>
          <Link href="/dashboard/bill-negotiator" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            textDecoration: 'none'
          }}>
            <svg width="32" height="32" viewBox="0 0 72 72" fill="none">
              <path d="M36 6C19.4315 6 6 19.4315 6 36C6 52.5685 19.4315 66 36 66" stroke="url(#g1)" strokeWidth="4" strokeLinecap="round"/>
              <path d="M36 6C52.5685 6 66 19.4315 66 36C66 52.5685 52.5685 66 36 66" stroke="url(#g2)" strokeWidth="4" strokeLinecap="round"/>
              <defs>
                <linearGradient id="g1" x1="6" y1="36" x2="36" y2="36">
                  <stop stopColor="#06b6d4"/>
                  <stop offset="1" stopColor="#3b82f6"/>
                </linearGradient>
                <linearGradient id="g2" x1="36" y1="36" x2="66" y2="36">
                  <stop stopColor="#3b82f6"/>
                  <stop offset="1" stopColor="#8b5cf6"/>
                </linearGradient>
              </defs>
            </svg>
            <span style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#f8fafc',
              letterSpacing: '0.05em'
            }}>SIRKL</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '16px', flex: 1 }}>
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard/bill-negotiator' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  marginBottom: '4px',
                  backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#334155';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #334155',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 12px',
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>S</span>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', color: '#f8fafc', margin: 0 }}>Solidarity</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Bill Negotiator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div style={{ 
        flex: 1, 
        marginLeft: '256px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <header style={{
          height: '64px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
        }}>
          <h1 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#f8fafc',
            margin: 0,
          }}>
            Bill Negotiator
          </h1>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notifications */}
            <button style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>U</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
