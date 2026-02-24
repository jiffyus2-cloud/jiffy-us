/**
 * Design System for Photo Album Creator App
 * Centralizes all styles, color variables, and component variants.
 * Modify this file to update the visual identity of the entire project.
 */

export const COLORS = {
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  muted: 'var(--muted)',
  mutedForeground: 'var(--muted-foreground)',
  accent: 'var(--accent)',
  accentForeground: 'var(--accent-foreground)',
  destructive: 'var(--destructive)',
  border: 'var(--border)',
  input: 'var(--input)',
  ring: 'var(--ring)',
};

export const DESIGN_TOKENS = {
  radius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
  },
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  },
};

export const DESIGN = {
  // Layout Containers
  layout: {
    container: 'max-w-7xl mx-auto px-4',
    containerNarrow: 'max-w-4xl mx-auto px-4',
    section: 'py-24 px-4',
    sectionGray: 'py-24 px-4 bg-gray-50',
    grid: 'grid grid-cols-1 md:grid-cols-3 gap-6',
    flexCenter: 'flex items-center justify-center',
  },

  // Typography
  text: {
    h1: 'text-5xl md:text-7xl font-medium mb-6',
    h2: 'text-5xl text-center font-medium mb-4',
    h3: 'text-3xl font-medium mb-3',
    h4: 'text-2xl font-medium mb-2',
    subtitle: 'text-xl md:text-2xl mb-8',
    sectionSubtitle: 'text-xl text-gray-600 text-center mb-16',
    body: 'text-lg text-gray-600',
    bodySmall: 'text-sm text-gray-600',
    label: 'text-base font-medium',
    footerHeading: 'text-lg font-medium mb-4',
    footerLink: 'text-gray-400 hover:text-white transition-colors',
  },

  // Buttons
  button: {
    base: 'px-12 py-4 rounded-lg text-xl font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-white text-black hover:bg-gray-100',
    outline: 'border-2 border-gray-300 bg-white hover:border-black hover:shadow-lg',
    sm: 'px-6 py-3 text-base',
    xs: 'px-4 py-2 text-sm',
  },

  // Cards & Interactive Elements
  card: {
    base: 'group relative overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02]',
    interactive: 'cursor-pointer',
    content: 'absolute bottom-0 left-0 right-0 p-8 text-white',
    overlay: 'absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-70',
    border: 'border-2 rounded-lg transition-all text-left overflow-hidden flex flex-col',
    selected: 'border-black bg-black text-white',
    unselected: 'border-gray-300 bg-white hover:border-black hover:shadow-lg',
  },

  // Navigation & Footer
  nav: {
    indicator: 'w-3 h-3 rounded-full transition-all',
    indicatorActive: 'bg-white w-8',
    indicatorInactive: 'bg-white bg-opacity-50',
  },
  footer: {
    wrapper: 'bg-black text-white py-16 px-4',
    bottom: 'border-t border-gray-800 pt-8 text-center text-gray-400',
  },
};
