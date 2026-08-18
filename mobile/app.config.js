import appJson from './app.json';

/**
 * Dynamic Expo configuration with environment variable support.
 *
 * Environment Variables (all optional):
 *   - EXPO_OWNER: Expo account/organization name
 *   - EAS_PROJECT_ID: EAS project ID (from eas init)
 *   - EAS_PROJECT_SLUG: EAS project slug (must match the slug registered with EAS_PROJECT_ID)
 *   - IOS_BUNDLE_IDENTIFIER: iOS bundle identifier
 *   - ANDROID_PACKAGE: Android package name
 *   - EXPO_PUBLIC_API_URL: Backend API base URL for generated apps
 *   - EXPO_PUBLIC_NEON_AUTH_URL: Neon Auth base URL for generated apps
 *   - EXPO_PUBLIC_UPDATES_URL: Override updates URL (e.g. custom update server)
 *   - CUSTOM_EXPO_UPDATE_BASE_URL: Base URL to derive /api/v1/expo-updates/update
 *   - EXPO_TOKEN: Expo access token (for authentication)
 *
 * Use Cases:
 *   1. Developer Testing: Set your own Expo account to test locally
 *   2. Staging Environment: Use different Expo project than production
 *   3. Multi-Environment Deployments: Different configs per environment
 *
 * Defaults (when env vars not set):
 *   - Uses values from app.json (production Appifex account)
 */
export default () => {
  // Read environment variables (fallback to app.json if not set)
  const owner = process.env.EXPO_OWNER || appJson.expo.owner;
  const slug = process.env.EAS_PROJECT_SLUG || appJson.expo.slug;
  const easProjectId = process.env.EAS_PROJECT_ID || appJson.expo.extra?.eas?.projectId;
  const bundleId = process.env.IOS_BUNDLE_IDENTIFIER || appJson.expo.ios?.bundleIdentifier;
  const androidPackage = process.env.ANDROID_PACKAGE || appJson.expo.android?.package;
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL || appJson.expo.extra?.apiUrl || null;
  const neonAuthUrl =
    process.env.EXPO_PUBLIC_NEON_AUTH_URL ||
    appJson.expo.extra?.neonAuthUrl ||
    null;
  console.log('📦 Expo public env summary:', {
    hasExpoPublicApiUrl: Boolean(process.env.EXPO_PUBLIC_API_URL),
    hasExpoPublicNeonAuthUrl: Boolean(process.env.EXPO_PUBLIC_NEON_AUTH_URL),
    hasUnexpectedViteApiUrl: Boolean(process.env.VITE_API_URL),
    hasUnexpectedViteNeonAuthUrl: Boolean(process.env.VITE_NEON_AUTH_URL),
    resolvedApiUrl: apiUrl,
    resolvedNeonAuthUrl: neonAuthUrl,
  });
  // Updates URL: defaults to standard EAS Update (from app.json).
  // Set EXPO_PUBLIC_UPDATES_URL to override (e.g. custom update server).
  // CUSTOM_EXPO_UPDATE_BASE_URL derives the URL when full override is not provided.
  const updateBaseUrl =
    process.env.CUSTOM_EXPO_UPDATE_BASE_URL || appJson.expo.extra?.updatesBaseUrl || null;
  const updatesUrl =
    process.env.EXPO_PUBLIC_UPDATES_URL ||
    (updateBaseUrl ? `${updateBaseUrl.replace(/\/$/, '')}/api/v1/expo-updates/update` : null) ||
    (easProjectId ? `https://u.expo.dev/${easProjectId}` : null) ||
    appJson.expo.updates?.url;

  // Log when using custom configuration
  if (process.env.EXPO_OWNER || process.env.EAS_PROJECT_ID) {
    console.log('🔧 Using environment-based configuration:');
    if (process.env.EXPO_OWNER) {
      console.log(`   Owner: ${owner}`);
    }
    if (process.env.EAS_PROJECT_ID) {
      console.log(`   Project ID: ${easProjectId}`);
    }
  }

  return {
    ...appJson.expo,

    // Ensure runtimeVersion is always present (EAS Update crashes without it).
    // The AI may accidentally remove it from app.json via SEARCH/REPLACE edits.
    runtimeVersion: appJson.expo.runtimeVersion || "1.0.0",

    // Override with environment variables if set
    slug: slug,
    owner: owner,

    ios: {
      ...appJson.expo.ios,
      bundleIdentifier: bundleId,
    },

    android: {
      ...appJson.expo.android,
      package: androidPackage,
    },

    extra: {
      ...appJson.expo.extra,
      eas: {
        projectId: easProjectId
      },
      ...(apiUrl ? { apiUrl } : {}),
      ...(neonAuthUrl ? { neonAuthUrl } : {}),
    },

    updates: {
      ...appJson.expo.updates,
      url: updatesUrl,
    }
  };
};
