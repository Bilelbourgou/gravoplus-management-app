export const colors = {
  primary: {
    50: '#f1f8e9',
    100: '#dcedc8',
    200: '#c5e1a5',
    300: '#aed581',
    400: '#9ccc65',
    500: '#8BC34A',
    600: '#7cb342',
    700: '#689f38',
    800: '#558b2f',
    900: '#33691e',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  success: {
    500: '#2E7D55',
    600: '#256647',
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },
  info: {
    500: '#2E7D55',
    600: '#256647',
  },
  background: {
    base: '#020617',
    surface: '#0f172a',
    elevated: '#1e293b',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#64748b',
  },
  border: {
    default: '#334155',
    subtle: '#1e293b',
  },
};

export const statusColors = {
  DRAFT: colors.neutral[400],
  VALIDATED: colors.info[500],
  INVOICED: colors.success[500],
  CANCELLED: colors.error[500],
};

export const machineColors = {
  CNC: colors.primary[500],
  LASER: colors.warning[500],
  CHAMPS: colors.success[500],
  PANNEAUX: colors.info[500],
  SERVICE_MAINTENANCE: colors.error[500], // Use a distinct color, e.g. error (red) or maybe purple/secondary if available. Let's stick to standard palette.
};
