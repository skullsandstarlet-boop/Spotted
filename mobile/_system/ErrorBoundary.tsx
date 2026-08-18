/**
 * CRITICAL: DO NOT MODIFY THIS FILE
 *
 * Error Boundary component that catches React render errors and provides a way
 * to return to the Appifex sandbox app. This prevents users from being
 * stuck on a crashed target app with no way to recover.
 *
 * This catches any unhandled JavaScript/React errors during rendering,
 * including component errors, null reference errors, and invalid props.
 *
 * Note: Native module crashes (e.g., missing native modules) may not be
 * catchable if they occur before React renders.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type * as UpdatesType from 'expo-updates';
import type * as SecureStoreType from 'expo-secure-store';

// expo-updates and expo-secure-store use dynamic require to avoid crashing
// in environments where the native modules aren't linked (e.g. Expo Go)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Updates: typeof UpdatesType | null = (() => { try { return require('expo-updates'); } catch { return null; } })();
const SecureStore: typeof SecureStoreType | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Platform.OS !== 'web' ? (() => { try { return require('expo-secure-store'); } catch { return null; } })() : null;

// SecureStore keys for cross-app navigation
const RETURN_PROJECT_ID_KEY = 'appifex_return_project_id';
const INITIAL_ROUTE_KEY = 'appifex_initial_route';
const SWITCH_STATE_KEY = 'appifex_switch_state';

// Safe wrapper - setUpdateRequestHeadersOverride throws in some dev client builds
function safeSetHeadersOverride(headers: Record<string, string> | null): void {
  try {
    Updates?.setUpdateRequestHeadersOverride(headers);
  } catch {
    // Not available in this runtime - ignore
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isReturning: boolean;
}

/**
 * Clear switch state and header override.
 */
async function clearSwitchState(): Promise<void> {
  if (Platform.OS === 'web' || !SecureStore) return;
  try {
    safeSetHeadersOverride(null);
    await SecureStore.deleteItemAsync(SWITCH_STATE_KEY);
  } catch {
    // Ignore cleanup errors
  }
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReturning: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Attach component stack to the error so the telemetry handler can include it.
    // The early-error-handler console.error override picks up Error objects
    // and sends their _componentStack field in the telemetry payload.
    (error as any)._componentStack = errorInfo.componentStack;
    console.error('[ErrorBoundary]', error);
  }

  handleReturnToAppifex = async () => {
    if (Platform.OS === 'web' || !SecureStore) {
      return;
    }

    this.setState({ isReturning: true });

    try {
      // 1. Set switch state FIRST
      await SecureStore.setItemAsync(SWITCH_STATE_KEY, 'switching_to_sandbox');

      // 2. Read the sandbox channel
      const storedChannel = await SecureStore.getItemAsync('appifex_sandbox_channel');
      const sandboxChannel = storedChannel || (__DEV__ ? 'preview' : 'production');

      // 3. Read project ID and store initial route
      const projectId = await SecureStore.getItemAsync(RETURN_PROJECT_ID_KEY);
      if (projectId) {
        await SecureStore.setItemAsync(INITIAL_ROUTE_KEY, `/project/${projectId}`);
      }

      // 4. Small delay to ensure SecureStore writes are flushed
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. Override channel header
      safeSetHeadersOverride({
        'expo-channel-name': sandboxChannel,
      });

      // 6. Fetch and reload
      const result = await Updates?.fetchUpdateAsync();
      if (result?.isNew) {
        await Updates?.reloadAsync();
      } else {
        // No update available - clean up
        await clearSwitchState();
        if (projectId) {
          await SecureStore.deleteItemAsync(INITIAL_ROUTE_KEY);
        }
        this.setState({ isReturning: false });
      }
    } catch (error) {
      await clearSwitchState();
      try {
        await SecureStore.deleteItemAsync(INITIAL_ROUTE_KEY);
      } catch {
        // Ignore
      }
      this.setState({ isReturning: false });
      console.error('[ErrorBoundary] Return to Appifex failed:', error);
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, isReturning } = this.state;

      // Check if it's a native module error (missing or incompatible native components)
      const isNativeModuleError =
        error?.message?.includes('View config not found') ||
        error?.message?.includes('native module') ||
        error?.message?.includes('requireNativeComponent') ||
        error?.message?.includes('NativeModule') ||
        error?.message?.includes('Cannot read property') ||
        error?.message?.includes('undefined is not an object');

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.emoji}>😵</Text>
              <Text style={styles.title}>Something went wrong</Text>

              {isNativeModuleError && (
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>
                    This error usually means the app uses a library that is not compatible with Expo.
                    The code needs to be fixed.
                  </Text>
                </View>
              )}

              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>{error?.name || 'Error'}</Text>
                <Text style={styles.errorMessage}>{error?.message}</Text>
              </View>

              {errorInfo?.componentStack && (
                <View style={styles.stackBox}>
                  <Text style={styles.stackTitle}>Component Stack:</Text>
                  <Text style={styles.stackText} numberOfLines={10}>
                    {errorInfo.componentStack.trim()}
                  </Text>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={this.handleReturnToAppifex}
                  disabled={isReturning}
                >
                  {isReturning ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Return to Appifex</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.footerText}>
                Return to Appifex to fix the code and try again.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  hintBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  hintText: {
    color: '#ffc107',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#fca5a5',
    fontSize: 14,
    lineHeight: 20,
  },
  stackBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  stackTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stackText: {
    color: '#666',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
});

// Default export for compatibility with both import styles:
// import { ErrorBoundary } from '...' (named)
// import ErrorBoundary from '...' (default)
export default ErrorBoundary;
