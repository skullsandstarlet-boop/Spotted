/**
 * Spotted brand palette — luxurious black + bubblegum pink.
 * Single source of truth for the visual rebrand (owner: Skulls and Starlet Go).
 * Import these values in screens/components that use inline StyleSheets.
 */
export const colors = {
  // backgrounds
  background: '#0A0A0A', // near-black, main app bg
  black: '#000000',
  surface: '#1A1A1A', // cards, form surfaces
  surfaceElevated: '#242424', // elevated surfaces / inputs
  // brand
  primary: '#FF69B4', // bubblegum pink
  onPrimary: '#0A0A0A', // text/icon on pink (keeps contrast readable)
  accent: '#FF9ECF', // lighter pink for kickers/accents on dark
  // text
  text: '#F5F5F5', // near-white
  textSecondary: '#C9B3BE', // muted soft grey-pink
  textTertiary: '#8A7A88',
  // lines / feedback
  border: '#2A2A2A',
  error: '#FF6B7D',
  success: '#4ADE80',
  warning: '#FFB26B',
} as const;
