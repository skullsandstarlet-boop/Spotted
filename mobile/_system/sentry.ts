/**
 * Sentry Error Tracking for Appifex Generated Apps
 *
 * CRITICAL: DO NOT MODIFY OR REMOVE THIS FILE
 * This file is part of the Appifex system and enables automatic error tracking.
 * Errors captured here are sent to Appifex for one-click AI-powered fixes.
 *
 * Based on official Sentry Expo Router setup:
 * https://docs.sentry.io/platforms/react-native/tracing/instrumentation/expo-router/
 */

import * as Sentry from '@sentry/react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { APPIFEX_CONFIG } from './appifex-config';

// Check if running in Expo Go (where native features aren't available)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Navigation integration - created during init, exported for _layout.tsx
let navigationIntegration: ReturnType<typeof Sentry.reactNavigationIntegration> | null = null;

/**
 * Initialize Sentry error tracking with Appifex metadata.
 *
 * Configuration is loaded from appifex-config.ts which contains hardcoded
 * values generated during code generation. This ensures project/session IDs
 * are always available, regardless of environment variable availability.
 */
function initializeSentry(): void {
  const sentryDsn = APPIFEX_CONFIG.sentryDsn;

  if (!sentryDsn || sentryDsn.includes('{{')) {
    // Sentry not configured or still has template placeholder - normal for local development
    return;
  }

  // Create navigation integration for Expo Router tracing
  navigationIntegration = Sentry.reactNavigationIntegration({
    enableTimeToInitialDisplay: !isExpoGo,
  });

  Sentry.init({
    dsn: sentryDsn,
    environment: __DEV__ ? 'development' : 'production',

    // Enable in both dev and prod for Appifex error tracking
    // Dev mode errors help catch issues during preview testing
    enabled: true,

    // Capture 100% of errors for full visibility
    sampleRate: 1.0,

    // Enable performance tracing
    tracesSampleRate: 1.0,

    // Add navigation integration for route tracking
    integrations: [navigationIntegration],

    // Disable native frames in Expo Go (not available)
    enableNativeFramesTracking: !isExpoGo,
  });

  // Set global tags AFTER init - this ensures tags are indexed by Sentry
  // and included in webhook payloads
  // Using hardcoded values from appifex-config.ts for reliability
  Sentry.setTags({
    appifex_project_id: APPIFEX_CONFIG.projectId,
  });
}

// Auto-initialize on import (must happen before app renders)
initializeSentry();

/**
 * Get the navigation integration for registering with the navigation container.
 * Returns null if Sentry is not configured (no DSN).
 */
export function getNavigationIntegration() {
  return navigationIntegration;
}

// Export Sentry.wrap for wrapping root component
export const wrapWithSentry = Sentry.wrap;
