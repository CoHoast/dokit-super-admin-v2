'use client';

import { colors, cardStyle, statusColors, iconBgColors } from '@/lib/design-tokens';
import Link from 'next/link';

// Page Header Component
export const PageHeader = ({ 
  title, 
  subtitle,
  action 
}: { 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div style={{ 
    marginBottom: '24px', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start' 
  }}>
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: '600', color: colors.text, marginBottom: '4px' }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: '14px', color: colors.textSecondary }}>{subtitle}</p>
      )}
    </div>
    {action}
  </div>
);

// Stat Card Component
export const StatCard = ({
  label,
  value,
  icon,
  iconColor = 'purple',
  badge,
  badgeColor = 'green',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: keyof typeof iconBgColors;
  badge?: string;
  badgeColor?: 'green' | 'amber' | 'rose';
}) => {
  const iconStyle = iconBgColors[iconColor];
  const badgeColors = {
    green: { bg: colors.greenLight, text: colors.green },
    amber: { bg: colors.amberLight, text: colors.amber },
    rose: { bg: colors.roseLight, text: colors.rose },
  };
  const badgeStyle = badgeColors[badgeColor];

  return (
    <div style={{ ...cardStyle, padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: iconStyle.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: iconStyle.stroke,
        }}>
          {icon}
        </div>
        {badge && (
          <span style={{
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            background: badgeStyle.bg,
            color: badgeStyle.text,
          }}>
            {badge}
          </span>
        )}
      </div>
      <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: '700', color: colors.text, letterSpacing: '-0.5px' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
};

// Status Badge Component
export const StatusBadge = ({ 
  status, 
  customColors 
}: { 
  status: string;
  customColors?: { bg: string; text: string };
}) => {
  const normalizedStatus = status.toLowerCase();
  const style = customColors || statusColors[normalizedStatus] || statusColors.draft;
  
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      background: style.bg,
      color: style.text,
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
};

// Card Component
export const Card = ({ 
  children, 
  padding = '20px',
  style: customStyle = {},
}: { 
  children: React.ReactNode;
  padding?: string;
  style?: React.CSSProperties;
}) => (
  <div style={{ ...cardStyle, padding, ...customStyle }}>
    {children}
  </div>
);

// Card with Header Component
export const CardWithHeader = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
    <div style={{ 
      padding: '18px 20px', 
      borderBottom: `1px solid ${colors.borderLight}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: colors.text, marginBottom: subtitle ? '2px' : 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: colors.textMuted }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// Section Header Component
export const SectionHeader = ({ 
  title, 
  action 
}: { 
  title: string;
  action?: React.ReactNode;
}) => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: '16px'
  }}>
    <h3 style={{ fontSize: '15px', fontWeight: '600', color: colors.text }}>
      {title}
    </h3>
    {action}
  </div>
);

// Empty State Component
export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div style={{ padding: '48px', textAlign: 'center' }}>
    {icon && (
      <div style={{ marginBottom: '16px', color: colors.textMuted }}>
        {icon}
      </div>
    )}
    <p style={{ fontSize: '15px', fontWeight: '500', color: colors.text, marginBottom: '4px' }}>
      {title}
    </p>
    {description && (
      <p style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '16px' }}>
        {description}
      </p>
    )}
    {action}
  </div>
);

// Button Components
export const Button = ({
  children,
  variant = 'primary',
  onClick,
  href,
  style: customStyle = {},
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
  href?: string;
  style?: React.CSSProperties;
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textDecoration: 'none',
    border: 'none',
    ...customStyle,
  };

  const variantStyle = variant === 'primary' 
    ? { background: colors.text, color: 'white' }
    : { background: colors.cardBg, color: colors.text, border: `1px solid ${colors.border}` };

  if (href) {
    return (
      <Link href={href} style={{ ...baseStyle, ...variantStyle }}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} style={{ ...baseStyle, ...variantStyle }}>
      {children}
    </button>
  );
};

// Data Table Component
export const DataTable = ({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
}: {
  columns: { key: string; label: string; width?: string; render?: (value: any, row: any) => React.ReactNode }[];
  data: any[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
}) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        {columns.map(col => (
          <th key={col.key} style={{
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: '12px',
            fontWeight: '500',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            borderBottom: `1px solid ${colors.border}`,
            width: col.width,
          }}>
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.length === 0 ? (
        <tr>
          <td colSpan={columns.length} style={{ padding: '48px', textAlign: 'center', color: colors.textMuted }}>
            {emptyMessage}
          </td>
        </tr>
      ) : (
        data.map((row, i) => (
          <tr 
            key={i}
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            onMouseEnter={(e) => onRowClick && (e.currentTarget.style.background = colors.borderLight)}
            onMouseLeave={(e) => onRowClick && (e.currentTarget.style.background = 'transparent')}
          >
            {columns.map(col => (
              <td key={col.key} style={{
                padding: '14px 16px',
                fontSize: '14px',
                color: colors.text,
                borderBottom: `1px solid ${colors.borderLight}`,
              }}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </td>
            ))}
          </tr>
        ))
      )}
    </tbody>
  </table>
);

// Icon wrapper for consistent sizing
export const Icon = ({ 
  children, 
  size = 20, 
  color = 'currentColor' 
}: { 
  children: React.ReactNode;
  size?: number;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// Common SVG Icons as components (replacing emojis)
export const Icons = {
  document: <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>,
  documentCorner: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  check: <polyline points="20 6 9 17 4 12"/>,
  checkCircle: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  lightning: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></>,
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>,
  chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  upload: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  dollarSign: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
  building: <><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16"/><path d="M1 21h22"/><path d="M9 7h1"/><path d="M9 11h1"/><path d="M9 15h1"/><path d="M14 7h1"/><path d="M14 11h1"/><path d="M14 15h1"/></>,
  mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
  alertCircle: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
  trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>,
  edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
  chevronDown: <polyline points="6 9 12 15 18 9"/>,
  externalLink: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
};
