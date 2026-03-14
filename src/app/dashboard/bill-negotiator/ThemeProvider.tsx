'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Sirkl Brand Colors (from brand guide)
// #0B0F14 - Midnight (darkest bg)
// #151A21 - Graphite (card bg)
// #3822F6 - Blue accent
// #6622F6 - Electric Blue (primary accent)
// #667783 - Steel Gray (muted text)

export const themes = {
  dark: {
    bg: '#0b0f14',
    surface: '#151a21',
    surfaceHover: '#1a2029',
    border: '#262d37',
    borderLight: '#333d4a',
    text: '#f0f2f5',
    textMuted: '#667783',
    // Primary accent - Electric Blue
    accent: '#6622F6',
    accentLight: 'rgba(102, 34, 246, 0.15)',
    accentGlow: 'rgba(102, 34, 246, 0.3)',
    // Secondary - Blue
    blue: '#3822f6',
    blueLight: 'rgba(56, 34, 246, 0.15)',
    // Status colors - tinted with brand
    success: '#22c55e',
    successLight: 'rgba(34, 197, 94, 0.15)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.15)',
    danger: '#ef4444',
    dangerLight: 'rgba(239, 68, 68, 0.15)',
    // Gradients
    gradient: 'linear-gradient(135deg, #3822f6 0%, #6622F6 100%)',
    gradientAccent: 'linear-gradient(135deg, #6622F6 0%, #8b5cf6 100%)',
    glow: '0 0 40px rgba(102, 34, 246, 0.2)',
    cardShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
  },
  light: {
    bg: '#f5f7fa',
    surface: '#ffffff',
    surfaceHover: '#f8f9fb',
    border: '#e2e8f0',
    borderLight: '#cbd5e1',
    text: '#0f172a',
    textMuted: '#64748b',
    // Primary accent - Electric Blue
    accent: '#6622F6',
    accentLight: 'rgba(102, 34, 246, 0.1)',
    accentGlow: 'rgba(102, 34, 246, 0.2)',
    // Secondary - Blue
    blue: '#3822f6',
    blueLight: 'rgba(56, 34, 246, 0.1)',
    // Status colors
    success: '#16a34a',
    successLight: 'rgba(22, 163, 74, 0.1)',
    warning: '#d97706',
    warningLight: 'rgba(217, 119, 6, 0.1)',
    danger: '#dc2626',
    dangerLight: 'rgba(220, 38, 38, 0.1)',
    // Gradients
    gradient: 'linear-gradient(135deg, #3822f6 0%, #6622F6 100%)',
    gradientAccent: 'linear-gradient(135deg, #6622F6 0%, #8b5cf6 100%)',
    glow: '0 0 40px rgba(102, 34, 246, 0.15)',
    cardShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
};

type ThemeContextType = {
  isDark: boolean;
  toggle: () => void;
  colors: typeof themes.dark;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggle: () => {},
  colors: themes.dark,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const colors = isDark ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark(!isDark), colors }}>
      {children}
    </ThemeContext.Provider>
  );
}
