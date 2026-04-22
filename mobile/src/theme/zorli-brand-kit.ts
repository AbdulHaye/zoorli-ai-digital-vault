/**
 * Zorli AI Vault - Brand Kit (React Native)
 * 
 * This file contains the complete Zorli design system for React Native.
 * It provides a cohesive, professional blue-themed design with:
 * - Custom color palette
 * - Typography system
 * - Component styles (buttons, cards, inputs)
 * - Spacing and layout constants
 * 
 * Usage: Import and use in StyleSheet.create() or inline styles
 */

import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

// ========================================
// DESIGN TOKENS
// ========================================

export const Colors = {
  // Core Colors
  vaultBlue: '#2B6CB0',
  skyTrust: '#A0C4E8',
  softCloud: '#F7FAFC',
  warmStone: '#E2E8F0',
  deepSlate: '#2D3748',
  successGreen: '#48BB78',
  errorRed: '#E53E3E',
  
  // Shade Scale - Vault Blue
  vault100: '#EBF8FF',
  vault300: '#A0C4E8',
  vault500: '#2B6CB0',
  vault700: '#2C5282',
  vault900: '#1A365D',
  
  // Common
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const Typography = {
  // Font Families
  fontPrimary: 'System',
  
  // Font Sizes
  xs: 12,
  sm: 14,
  base: 15,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
  
  // Font Weights
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  
  // Line Heights
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

// ========================================
// COMPONENT STYLES
// ========================================

export const ComponentStyles = StyleSheet.create({
  // Typography Styles
  h1: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.sm,
  },
  h2: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.sm,
  },
  h3: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.sm,
  },
  h4: {
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.sm,
  },
  h5: {
    fontSize: Typography.lg,
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.sm,
  },
  h6: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.sm,
  },
  
  bodyText: {
    fontSize: Typography.base,
    color: Colors.deepSlate,
    lineHeight: Typography.base * Typography.normal,
  },
  
  // Button Styles
  buttonBase: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Shadows.sm,
  },
  
  buttonPrimary: {
    backgroundColor: Colors.vaultBlue,
  },
  
  buttonSuccess: {
    backgroundColor: Colors.successGreen,
  },
  
  buttonError: {
    backgroundColor: Colors.errorRed,
  },
  
  buttonSecondary: {
    backgroundColor: Colors.warmStone,
  },
  
  buttonOutline: {
    backgroundColor: Colors.transparent,
    borderWidth: 2,
    borderColor: Colors.vaultBlue,
  },
  
  buttonTextPrimary: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  
  buttonTextSecondary: {
    color: Colors.deepSlate,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  
  buttonTextOutline: {
    color: Colors.vaultBlue,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
  
  buttonSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  
  buttonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  
  buttonTextSmall: {
    fontSize: Typography.sm,
  },
  
  buttonTextLarge: {
    fontSize: Typography.lg,
  },
  
  buttonDisabled: {
    opacity: 0.6,
  },
  
  // Card Styles
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.warmStone,
    ...Shadows.sm,
  },
  
  cardHeader: {
    fontSize: Typography.xl,
    fontWeight: Typography.semibold,
    color: Colors.vaultBlue,
    marginBottom: Spacing.md,
  },
  
  cardBody: {
    color: Colors.deepSlate,
  },
  
  cardFooter: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.warmStone,
  },
  
  // Input Styles
  input: {
    width: '100%',
    padding: Spacing.md,
    fontSize: Typography.base,
    borderWidth: 1,
    borderColor: Colors.warmStone,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.white,
    color: Colors.deepSlate,
  },
  
  inputFocused: {
    borderColor: Colors.skyTrust,
    borderWidth: 2,
  },
  
  inputError: {
    borderColor: Colors.errorRed,
  },
  
  inputSuccess: {
    borderColor: Colors.successGreen,
  },
  
  inputDisabled: {
    backgroundColor: Colors.softCloud,
    opacity: 0.7,
  },
  
  // Badge Styles
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  
  badgePrimary: {
    backgroundColor: Colors.vault100,
  },
  
  badgeSuccess: {
    backgroundColor: '#c6f6d5',
  },
  
  badgeError: {
    backgroundColor: '#fed7d7',
  },
  
  badgeWarning: {
    backgroundColor: '#fefcbf',
  },
  
  badgeTextPrimary: {
    color: Colors.vault700,
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  
  badgeTextSuccess: {
    color: '#22543d',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  
  badgeTextError: {
    color: '#742a2a',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  
  badgeTextWarning: {
    color: '#744210',
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  
  // Alert Styles
  alert: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    marginBottom: Spacing.lg,
  },
  
  alertInfo: {
    backgroundColor: Colors.vault100,
    borderLeftColor: Colors.vaultBlue,
  },
  
  alertSuccess: {
    backgroundColor: '#c6f6d5',
    borderLeftColor: Colors.successGreen,
  },
  
  alertError: {
    backgroundColor: '#fed7d7',
    borderLeftColor: Colors.errorRed,
  },
  
  alertWarning: {
    backgroundColor: '#fefcbf',
    borderLeftColor: '#ecc94b',
  },
  
  alertTextInfo: {
    color: Colors.vault900,
  },
  
  alertTextSuccess: {
    color: '#22543d',
  },
  
  alertTextError: {
    color: '#742a2a',
  },
  
  alertTextWarning: {
    color: '#744210',
  },
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Combines multiple style objects
 */
export const combineStyles = (...styles: any[]) => {
  return styles.filter(Boolean).flat();
};

/**
 * Creates a shadow style based on elevation
 */
export const createShadow = (elevation: 'sm' | 'md' | 'lg') => {
  return Shadows[elevation];
};

/**
 * Gets color with opacity
 */
export const withOpacity = (color: string, opacity: number) => {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

// ========================================
// THEME OBJECT (for easy import)
// ========================================

export const ZorliBrandKit = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  components: ComponentStyles,
  utils: {
    combineStyles,
    createShadow,
    withOpacity,
  },
};

export default ZorliBrandKit;
