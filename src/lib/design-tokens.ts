// DOKit Design System - Shared tokens for consistent styling

export const colors = {
  // Text
  text: '#1a1a2e',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  
  // Backgrounds
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  
  // Primary purple
  purple: '#7c3aed',
  purpleLight: '#ede9fe',
  
  // Accent colors
  green: '#10b981',
  greenLight: '#d1fae5',
  amber: '#f59e0b',
  amberLight: '#fef3c7',
  rose: '#f43f5e',
  roseLight: '#ffe4e6',
  cyan: '#06b6d4',
  cyanLight: '#cffafe',
  blue: '#3b82f6',
  blueLight: '#dbeafe',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  
  // Borders
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
};

// Common card styles
export const cardStyle = {
  background: colors.cardBg,
  borderRadius: '12px',
  border: `1px solid ${colors.border}`,
};

// Stat card icon backgrounds
export const iconBgColors = {
  purple: { bg: colors.purpleLight, stroke: colors.purple },
  green: { bg: colors.greenLight, stroke: colors.green },
  amber: { bg: colors.amberLight, stroke: colors.amber },
  rose: { bg: colors.roseLight, stroke: colors.rose },
  cyan: { bg: colors.cyanLight, stroke: colors.cyan },
  blue: { bg: colors.blueLight, stroke: colors.blue },
  gray: { bg: colors.grayLight, stroke: colors.gray },
};

// Status badge colors
export const statusColors: Record<string, { bg: string; text: string }> = {
  completed: { bg: colors.greenLight, text: colors.green },
  active: { bg: colors.greenLight, text: colors.green },
  success: { bg: colors.greenLight, text: colors.green },
  pending: { bg: colors.amberLight, text: colors.amber },
  review: { bg: colors.amberLight, text: colors.amber },
  warning: { bg: colors.amberLight, text: colors.amber },
  failed: { bg: colors.roseLight, text: colors.rose },
  error: { bg: colors.roseLight, text: colors.rose },
  rejected: { bg: colors.roseLight, text: colors.rose },
  processing: { bg: colors.blueLight, text: colors.blue },
  draft: { bg: colors.grayLight, text: colors.gray },
};

// Page header style
export const pageHeaderStyle = {
  marginBottom: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
};

// Section header style  
export const sectionHeaderStyle = {
  fontSize: '15px',
  fontWeight: '600' as const,
  color: colors.text,
  marginBottom: '16px',
};

// Button styles
export const buttonPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  background: colors.text,
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500' as const,
  cursor: 'pointer',
  transition: 'background 0.15s',
};

export const buttonSecondary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  background: colors.cardBg,
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500' as const,
  cursor: 'pointer',
  transition: 'all 0.15s',
};

// Table styles
export const tableHeaderStyle = {
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: '12px',
  fontWeight: '500' as const,
  color: colors.textMuted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
  borderBottom: `1px solid ${colors.border}`,
};

export const tableCellStyle = {
  padding: '14px 16px',
  fontSize: '14px',
  color: colors.text,
  borderBottom: `1px solid ${colors.borderLight}`,
};

// Empty state style
export const emptyStateStyle = {
  padding: '48px',
  textAlign: 'center' as const,
  color: colors.textMuted,
};
