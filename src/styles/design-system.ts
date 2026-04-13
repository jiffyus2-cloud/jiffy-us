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
    section: 'py-16 px-4',
    sectionGray: 'py-16 px-4 bg-gray-50',
    grid: 'grid grid-cols-1 md:grid-cols-3 gap-5',
    flexCenter: 'flex items-center justify-center',
  },

  // Typography
  text: {
    h1: 'text-4xl md:text-5xl font-medium mb-4 text-black',
    h2: 'text-3xl text-center font-medium mb-3',
    h3: 'text-xl font-medium mb-2',
    h4: 'text-lg font-medium mb-1',
    subtitle: 'text-lg md:text-xl mb-6',
    sectionSubtitle: 'text-base text-gray-500 text-center mb-10',
    body: 'text-base text-gray-600',
    bodySmall: 'text-sm text-gray-500',
    label: 'text-sm font-medium',
    footerHeading: 'text-sm font-semibold uppercase tracking-wider mb-4 text-gray-300',
    footerLink: 'text-gray-500 hover:text-white transition-colors text-sm',
  },

  // Buttons
  button: {
    base: 'px-8 py-3 rounded-lg text-base font-medium transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-white text-black hover:bg-gray-100',
    outline: 'border border-gray-200 bg-white hover:border-gray-400',
    sm: 'px-5 py-2.5 text-sm',
    xs: 'px-3 py-1.5 text-sm',
  },

  // Cards & Interactive Elements
  card: {
    base: 'group relative overflow-hidden rounded-xl transition-transform duration-300 hover:scale-[1.01]',
    interactive: 'cursor-pointer',
    content: 'absolute bottom-0 left-0 right-0 p-6 text-white',
    overlay: 'absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent',
    border: 'border rounded-lg transition-all text-left overflow-hidden flex flex-col',
    selected: 'border-black bg-black text-white',
    unselected: 'border-gray-200 bg-white hover:border-gray-400',
  },

  // Navigation & Footer
  nav: {
    indicator: 'w-2 h-2 rounded-full transition-all',
    indicatorActive: 'bg-white w-6',
    indicatorInactive: 'bg-white/40',
  },
  footer: {
    wrapper: 'bg-gray-950 text-white py-12 px-4',
    bottom: 'border-t border-gray-800 pt-6 text-center text-gray-600 text-sm',
  },
};
