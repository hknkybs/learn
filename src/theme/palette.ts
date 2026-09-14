export const lightColors = {
  background: '#F7F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EFEEF9',
  border: '#E4E3F0',
  text: '#1C1B2E',
  textMuted: '#6B6A80',
  textOnDark: '#F4F3FF',
  textOnDarkMuted: '#C9C7DE',

  primary: '#4F46E5',
  primaryLight: '#8B85F0',
  primaryMuted: '#EAE8FD',

  accent: '#D97706',
  accentLight: '#F2A93C',
  accentMuted: '#FCEBD2',

  danger: '#DC2626',
  dangerMuted: '#FBE1E1',

  statusNew: '#8B8AA0',
  statusNewMuted: '#EDEDF3',
  statusLearning: '#D97706',
  statusLearningMuted: '#FCEBD2',
  statusKnown: '#16A34A',
  statusKnownMuted: '#DFF5E6',
};

export const darkColors = {
  background: '#131220',
  surface: '#1C1B2E',
  surfaceMuted: '#252438',
  border: '#31304A',
  text: '#F1F0FA',
  textMuted: '#A6A4BF',
  textOnDark: '#F4F3FF',
  textOnDarkMuted: '#C9C7DE',

  primary: '#8B85F0',
  primaryLight: '#A9A4F5',
  primaryMuted: '#2A2850',

  accent: '#F2A93C',
  accentLight: '#F6C271',
  accentMuted: '#3B2C13',

  danger: '#F27575',
  dangerMuted: '#3A1E1E',

  statusNew: '#9B99B5',
  statusNewMuted: '#28273D',
  statusLearning: '#F2A93C',
  statusLearningMuted: '#3B2C13',
  statusKnown: '#4ADE80',
  statusKnownMuted: '#173A26',
};

export type ThemeColors = typeof lightColors;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#1C1B2E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8,
  },
};
