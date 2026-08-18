/**
 * Global Error Overlay Component
 *
 * Displays a user-friendly modal when a global error is set.
 * This catches errors from event handlers and unhandled promise rejections
 * that wouldn't be caught by React's ErrorBoundary.
 *
 * CRITICAL: DO NOT MODIFY - Part of Appifex error handling system
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { subscribeToGlobalError, clearGlobalError, getGlobalError } from './globalErrorState';

export function GlobalErrorOverlay(): React.ReactElement | null {
  const [error, setError] = useState<Error | null>(getGlobalError);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGlobalError(setError);
    return unsubscribe;
  }, []);

  const copyError = async () => {
    if (!error) return;
    const errorText = `${error.name || 'Error'}: ${error.message}${error.stack ? `\n\nStack trace:\n${error.stack}` : ''}`;
    await Clipboard.setStringAsync(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!error) return null;

  return (
    <Modal visible={true} animationType="fade" transparent={false}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😅</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. You can dismiss this and try again.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>{error.name || 'Error'}</Text>
              <Text style={styles.errorMessage}>{error.message}</Text>
            </View>

            {error.stack && __DEV__ && (
              <View style={styles.stackBox}>
                <Text style={styles.stackTitle}>Stack Trace (Dev Only):</Text>
                <Text style={styles.stackText} numberOfLines={8}>
                  {error.stack}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.copyButton}
              onPress={copyError}
            >
              <Text style={styles.copyButtonText}>{copied ? 'Copied!' : 'Copy error'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => clearGlobalError()}
            >
              <Text style={styles.buttonText}>Dismiss</Text>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              If this keeps happening, try restarting the app.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { padding: 24, alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#a0a0a0', marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 12, padding: 16, marginBottom: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  errorTitle: { color: '#ef4444', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  errorMessage: { color: '#fca5a5', fontSize: 14, lineHeight: 20 },
  stackBox: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, padding: 16, marginBottom: 24, width: '100%' },
  stackTitle: { color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' },
  stackText: { color: '#666', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 14 },
  copyButton: { backgroundColor: '#3b82f6', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', minHeight: 56, width: '100%', marginBottom: 12 },
  copyButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  button: { backgroundColor: '#3b82f6', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', minHeight: 56, width: '100%', marginBottom: 24 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  footerText: { color: '#666', fontSize: 13, textAlign: 'center' },
});
