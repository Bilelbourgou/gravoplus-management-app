export const colors = {
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
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
    500: '#22c55e',
    600: '#16a34a',
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
    500: '#3b82f6',
    600: '#2563eb',
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
};
