import { MD3LightTheme } from "react-native-paper";

/**
 * Brand Color Palette extracted directly from OCR-logo.png:
 * - Primary Brand Blue: #0267D2 (Vibrant electric cobalt from the "P" shield & "OCR" text)
 * - Accent Secondary: #0080FF (Bright blue glow & bracket accents)
 * - Deep Charcoal / Dark Navy: #0B192C (Camera frame, outer circle, & main text)
 * - Background Tones: #F4F7FB (Crisp light slate background)
 * - Card Surface: #FFFFFF
 * - Border Neutral: #E2E8F0
 */
export const Palette = {
  primary: "#0267D2",
  primaryDark: "#0B192C",
  secondary: "#0080FF",
  accent: "#2563EB",
  background: "#F4F7FB",
  surface: "#FFFFFF",
  cardBorder: "#E2E8F0",
  textPrimary: "#0B192C",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  badgeBg: "#EFF6FF",
  badgeBorder: "#BFDBFE",
  success: "#059669",
  successBg: "#ECFDF5",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  warning: "#D97706",
  warningBg: "#FFFBEB",
};

export const AppTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Palette.primary,
    secondary: Palette.secondary,
    background: Palette.background,
    surface: Palette.surface,
    outline: "#CBD5E1",
    onPrimary: "#FFFFFF",
  },
};
