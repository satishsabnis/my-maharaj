export const colors = {
  navy: '#1A3A5C',
  emerald: '#1E9E5E',
  gold: '#C9A227',
  cyan: '#A8DFF0',
  mintLight: '#D4EDE5',
  teal: '#1A6B5C',
  skyBlue: '#1A7AB4',
  textPrimary: '#1A3A5C',
  textSecondary: '#3A5A6A',
  textMuted: '#5A7A8A',
  textHint: '#8AAABB',
  white: '#FFFFFF',
  danger: '#E24B4A',
  amber: '#C9A227',
  cardBg: 'rgba(255,255,255,0.85)',
  cardBorder: 'rgba(255,255,255,0.6)',
  frostedGreen: 'rgba(168,224,192,0.38)',
  frostedCyan: 'rgba(168,220,240,0.38)',
  frostedNavy: 'rgba(180,200,230,0.38)',
};

export const gradientBg = {
  colors: ['#A8DFF0', '#C8EEF8', '#EAF8FC', '#F8FFFE', '#D0F0E0', '#A8E4C0'],
  locations: [0, 0.18, 0.35, 0.50, 0.72, 1],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

export const buttons = {
  primary: {
    backgroundColor: '#1E9E5E',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1A3A5C',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  secondaryText: {
    color: '#1A3A5C',
    fontSize: 16,
    fontWeight: '500' as const,
  },
  back: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#2E5480',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backText: {
    color: '#2E5480',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  home: {
    backgroundColor: '#2E5480',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  homeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700' as const,
  },
};

export const cards = {
  base: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  frostedGreen: {
    backgroundColor: 'rgba(168,224,192,0.38)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderLeftWidth: 3,
    borderLeftColor: '#1E9E5E',
    marginBottom: 6,
  },
  frostedCyan: {
    backgroundColor: 'rgba(168,220,240,0.38)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderLeftWidth: 3,
    borderLeftColor: '#1A7AB4',
    marginBottom: 6,
  },
  frostedNavy: {
    backgroundColor: 'rgba(180,200,230,0.38)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderLeftWidth: 3,
    borderLeftColor: '#1A3A5C',
    marginBottom: 6,
  },
};

export const typography = {
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: '#1E9E5E',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 7,
    paddingBottom: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#4A7A6A',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    color: '#1A3A5C',
    lineHeight: 1.4,
  },
  muted: {
    fontSize: 13,
    color: '#5A7A8A',
  },
};

export const chips = {
  base: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    fontSize: 9,
  },
  selected: {
    backgroundColor: '#1E9E5E',
    color: '#FFFFFF',
  },
  unselected: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1A3A5C',
    color: '#1A3A5C',
  },
};
