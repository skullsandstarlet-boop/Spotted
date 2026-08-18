/**
 * CRITICAL: Global Error Handler Setup
 *
 * This MUST be the first code that runs to capture early errors before
 * Sentry or any other error handlers initialize. Do NOT move or remove!
 */
import '../_system/early-error-handler';

import '../global.css';

import { useEffect } from 'react';
import { Stack, useNavigationContainerRef } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// CRITICAL: DO NOT REMOVE - Required for Appifex error tracking
import { getNavigationIntegration, wrapWithSentry } from '../_system/sentry';
// CRITICAL: DO NOT REMOVE - Required for Appifex sandbox switching
import { AppifexFloatingButton } from '../_system/AppifexFloatingButton';
// CRITICAL: DO NOT REMOVE - Required for crash recovery with "Return to Appifex" option
import { ErrorBoundary } from '../_system/ErrorBoundary';
// CRITICAL: DO NOT REMOVE - Required for displaying user-friendly error modal for event handler errors
import { GlobalErrorOverlay } from '../_system/GlobalErrorOverlay';

function RootLayout() {
  // Register navigation container with Sentry for route tracking
  const ref = useNavigationContainerRef();
  useEffect(() => {
    const navIntegration = getNavigationIntegration();
    if (ref && navIntegration) {
      navIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {/* CRITICAL: DO NOT REMOVE screenOptions - prevents "< (tabs)" from appearing on screens */}
        {/* CRITICAL: DO NOT REMOVE Stack.Screen children - causes "This screen does not exist" error! */}
        <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
          {/* CRITICAL: index screen MUST be registered - without this the app shows "This screen does not exist" on launch */}
          <Stack.Screen name="index" />
          {/* CRITICAL: (tabs) MUST be registered when using tab navigation - without this, redirecting to /(tabs) shows "This screen does not exist" */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="dark" />
        {/* CRITICAL: DO NOT REMOVE - Required for Appifex sandbox switching */}
        <AppifexFloatingButton />
        {/* CRITICAL: DO NOT REMOVE - Required for displaying user-friendly error modal */}
        <GlobalErrorOverlay />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// CRITICAL: Wrap with Sentry to capture render errors and navigation failures
export default wrapWithSentry(RootLayout);
