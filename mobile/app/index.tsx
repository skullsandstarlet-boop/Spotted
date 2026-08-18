/**
 * CRITICAL: This file MUST exist at app/index.tsx
 *
 * Without it, Expo Router shows "This screen does not exist" on app launch.
 *
 * For tab-based apps: Redirect to /(tabs) - the tabs handle navigation.
 * For non-tab apps: Replace this with your main screen content.
 */
import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to tabs - this is the entry point for tab-based apps
  return <Redirect href="/(tabs)" />;
}
