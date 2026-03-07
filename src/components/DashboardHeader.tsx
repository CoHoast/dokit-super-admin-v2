'use client';

// Dashboard Header Component - Personalized greeting, search, notifications, user avatar

import { useState } from 'react';

interface DashboardHeaderProps {
  userName?: string;
  userInitials?: string;
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
}

export function DashboardHeader({
  userName = 'there',
  userInitials = 'U',
  title,
  subtitle,
  showSearch = true,
  showNotifications = true,
  notificationCount = 0
}: DashboardHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '1px solid #f1f5f9'
      }}
    >
      {/* Left side - Greeting or Title */}
      <div>
        {title ? (
          <>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: '15px', color: '#64748b' }}>{subtitle}</p>
            )}
          </>
        ) : (
          <>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
              {getGreeting()}, <span style={{ color: '#6366f1' }}>{userName}</span> 👋
            </h1>
            <p style={{ fontSize: '15px', color: '#64748b' }}>
              Here's what's happening with your workflows today
            </p>
          </>
        )}
      </div>
      
      {/* Right side - Search, Notifications, User */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Search */}
        {showSearch && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              background: searchFocused ? '#fff' : '#f8fafc',
              border: searchFocused ? '1px solid #6366f1' : '1px solid #e2e8f0',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              boxShadow: searchFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none'
            }}
          >
            <svg width="18" height="18" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '14px',
                color: '#0f172a',
                width: '180px'
              }}
            />
            <kbd
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                color: '#94a3b8',
                background: '#fff',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontFamily: 'inherit'
              }}
            >
              ⌘K
            </kbd>
          </div>
        )}
        
        {/* Notifications */}
        {showNotifications && (
          <button
            style={{
              position: 'relative',
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#6366f1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <svg width="20" height="20" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {notificationCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '10px',
                  height: '10px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  border: '2px solid #fff'
                }}
              />
            )}
          </button>
        )}
        
        {/* User Avatar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '6px 12px 6px 6px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(99, 102, 241, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {userInitials}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
              {userName}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Admin
            </div>
          </div>
          <svg width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: '4px' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
