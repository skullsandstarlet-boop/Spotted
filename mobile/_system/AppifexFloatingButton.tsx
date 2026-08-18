/**
 * CRITICAL: DO NOT MODIFY THIS FILE
 *
 * This is a system component required for Appifex sandbox switching functionality.
 * This button allows users to switch back to the Appifex sandbox app from any target app.
 *
 * Modifying or removing this file will break the core Appifex functionality.
 *
 * NOTE: This component only renders on iOS and Android. It returns null on web
 * because expo-secure-store and expo-updates are not supported on web.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
  Text,
  ActivityIndicator,
  Modal,
  Platform,
  Image,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type * as UpdatesType from 'expo-updates';
import type * as SecureStoreType from 'expo-secure-store';

// expo-updates and expo-secure-store use dynamic require to avoid crashing
// in environments where the native modules aren't linked (e.g. Expo Go)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Updates: typeof UpdatesType | null = (() => { try { return require('expo-updates'); } catch { return null; } })();
const SecureStore: typeof SecureStoreType | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Platform.OS !== 'web' ? (() => { try { return require('expo-secure-store'); } catch { return null; } })() : null;

// Check if running in Expo Go (where channel switching isn't available)
let isExpoGo = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-constants');
  const Constants = mod.default;
  const { ExecutionEnvironment } = mod;
  isExpoGo = Constants.executionEnvironment === ExecutionEnvironment?.StoreClient;
} catch {
  // expo-constants not available
}

// SecureStore keys for cross-app navigation
const RETURN_PROJECT_ID_KEY = 'appifex_return_project_id';
const INITIAL_ROUTE_KEY = 'appifex_initial_route';
const SWITCH_STATE_KEY = 'appifex_switch_state';

// Safe wrapper - setUpdateRequestHeadersOverride throws in dev client builds
function safeSetHeadersOverride(headers: Record<string, string> | null): void {
  try {
    Updates?.setUpdateRequestHeadersOverride(headers);
  } catch {
    // Not available in dev client builds - ignore
  }
}

/**
 * Clear switch state and header override.
 * Provides atomic cleanup for incomplete switches.
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

type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface FloatingButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  position?: Position;
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

const TAB_BAR_HEIGHT = 50;
const EDGE_OFFSET = 12;
const EDGE_PADDING = 4;
const TAP_THRESHOLD = 10;
const EXPANDED_WIDTH = 116;
const ICON_SIZE = 28;
const COLLAPSE_DELAY = 5000;
const COLLAPSE_DURATION = 400;
const EXPAND_DURATION = 300;
const PEEK_INTERVAL = 30000;
const PEEK_HOLD = 2000;
const TOAST_HEIGHT = 32;
const TOAST_GAP = 8;

/** Calculate the initial (x, y) screen position from the position prop. */
const getInitialPosition = (
  pos: Position,
  buttonSize: number,
  screenWidth: number,
  screenHeight: number,
  insets: { top: number; bottom: number; left: number; right: number },
): { x: number; y: number } => {
  const bottomY = screenHeight - buttonSize - EDGE_OFFSET - insets.bottom - TAB_BAR_HEIGHT - 100;
  const topY = insets.top + EDGE_OFFSET;
  const rightX = screenWidth - buttonSize - EDGE_OFFSET;
  const leftX = EDGE_OFFSET;

  const positions: Record<Position, { x: number; y: number }> = {
    'bottom-right': { x: rightX, y: bottomY },
    'bottom-left': { x: leftX, y: bottomY },
    'top-right': { x: rightX, y: topY },
    'top-left': { x: leftX, y: topY },
  };
  return positions[pos];
};

/** Calculate valid drag boundaries within the safe area. */
const getDragBounds = (
  buttonSize: number,
  screenWidth: number,
  screenHeight: number,
  insets: { top: number; bottom: number; left: number; right: number },
) => ({
  minX: insets.left + EDGE_PADDING,
  maxX: screenWidth - buttonSize - insets.right - EDGE_PADDING,
  minY: insets.top + EDGE_PADDING,
  maxY: screenHeight - buttonSize - insets.bottom - TAB_BAR_HEIGHT - EDGE_PADDING,
});

export const AppifexFloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  children,
  position = 'bottom-right',
  size = 40,
  backgroundColor = 'transparent',
  style,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOnRight, setIsOnRight] = useState(position === 'bottom-right' || position === 'top-right');
  // In non-dev builds, only show if running inside the companion app
  // (the companion app stores this key before switching to a target app OTA)
  const [isInsideCompanion, setIsInsideCompanion] = useState<boolean | null>(__DEV__ ? true : null);
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // --- Expansion animation state ---
  const expansion = useRef(new Animated.Value(1)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInteracted = useRef(false);

  const collapsePill = useCallback(() => {
    Animated.timing(expansion, {
      toValue: 0,
      duration: COLLAPSE_DURATION,
      useNativeDriver: false,
    }).start();
  }, [expansion]);

  const expandPill = useCallback(() => {
    Animated.timing(expansion, {
      toValue: 1,
      duration: EXPAND_DURATION,
      useNativeDriver: false,
    }).start();
  }, [expansion]);

  const stopPeeking = useCallback(() => {
    hasInteracted.current = true;
    if (peekTimer.current) {
      clearInterval(peekTimer.current);
      peekTimer.current = null;
    }
  }, []);

  // Auto-collapse after initial delay, then peek periodically until user interacts
  useEffect(() => {
    collapseTimer.current = setTimeout(() => {
      collapsePill();
      // After initial collapse, start periodic peek reminders
      peekTimer.current = setInterval(() => {
        if (hasInteracted.current) {
          if (peekTimer.current) clearInterval(peekTimer.current);
          return;
        }
        expandPill();
        setTimeout(collapsePill, PEEK_HOLD);
      }, PEEK_INTERVAL);
    }, COLLAPSE_DELAY);
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current);
      if (peekTimer.current) clearInterval(peekTimer.current);
    };
  }, [collapsePill, expandPill]);

  // Animated interpolations
  const animatedWidth = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [size, EXPANDED_WIDTH],
  });
  const textOpacity = expansion.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0, 1],
  });
  const textWidth = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, EXPANDED_WIDTH - size],
  });
  const textMargin = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });
  // When on right edge, shift left position back so the right edge stays anchored
  const expandOffset = expansion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, EXPANDED_WIDTH - size],
  });

  // --- Drag state ---
  const initialPos = getInitialPosition(position, size, screenWidth, screenHeight, insets);
  const pan = useRef(new Animated.ValueXY(initialPos)).current;
  const animatedLeft = isOnRight
    ? Animated.subtract(pan.x, expandOffset)
    : pan.x;
  const lastPosition = useRef(initialPos);
  const isDragging = useRef(false);
  const boundsRef = useRef(getDragBounds(size, screenWidth, screenHeight, insets));
  boundsRef.current = getDragBounds(size, screenWidth, screenHeight, insets);

  // Re-clamp and snap to nearest edge when dimensions/insets change (e.g. rotation)
  useEffect(() => {
    const bounds = boundsRef.current;
    const cur = lastPosition.current;
    const clampedX = Math.min(Math.max(cur.x, bounds.minX), bounds.maxX);
    const clampedY = Math.min(Math.max(cur.y, bounds.minY), bounds.maxY);
    const snapX = (clampedX - bounds.minX) < (bounds.maxX - clampedX) ? bounds.minX : bounds.maxX;
    setIsOnRight(snapX === bounds.maxX);
    lastPosition.current = { x: snapX, y: clampedY };
    pan.setValue(lastPosition.current);
  }, [pan, screenWidth, screenHeight, insets.top, insets.bottom, insets.left, insets.right]);

  // In release builds, check if we're running inside the companion app
  // by looking for the sandbox channel key it sets before switching
  useEffect(() => {
    if (__DEV__ || Platform.OS === 'web' || !SecureStore) return;
    SecureStore.getItemAsync('appifex_sandbox_channel').then(val => {
      setIsInsideCompanion(val !== null);
    }).catch(() => setIsInsideCompanion(false));
  }, []);

  const performSwitch = useCallback(async (initialRouteOverride?: string) => {
    setIsLoading(true);
    try {
      // 1. Set switch state FIRST (before any other operations)
      // This enables recovery if app crashes during the switch
      await SecureStore!.setItemAsync(SWITCH_STATE_KEY, 'switching_to_sandbox');

      // 2. Read the sandbox channel that was stored when launching this target app
      // Falls back to 'development' in dev mode, 'production' in TestFlight builds
      const storedChannel = await SecureStore!.getItemAsync('appifex_sandbox_channel');
      const sandboxChannel = storedChannel || (__DEV__ ? 'development' : 'production');

      // 3. Store initial route BEFORE any update operations
      // This ensures the write completes before reloadAsync() kills the process
      if (initialRouteOverride) {
        // Direct override (e.g. /preview/{projectId}/{sessionId} from universal link)
        await SecureStore!.setItemAsync(INITIAL_ROUTE_KEY, initialRouteOverride);
      } else {
        // Default: navigate back to the project page
        const projectId = await SecureStore!.getItemAsync(RETURN_PROJECT_ID_KEY);
        if (projectId) {
          await SecureStore!.setItemAsync(INITIAL_ROUTE_KEY, `/project/${projectId}`);
        }
      }

      // 4. Small delay to ensure SecureStore writes are flushed to disk
      // before reloadAsync() terminates the process
      await new Promise(resolve => setTimeout(resolve, 200));

      // 5. Only override the channel header - URL is already configured in app.json
      safeSetHeadersOverride({ 'expo-channel-name': sandboxChannel });

      // Skip checkForUpdateAsync() - it doesn't work for cross-app switching
      // because it compares bundle hashes between different apps (meaningless)
      const result = await Updates?.fetchUpdateAsync();
      if (result?.isNew) {
        // Note: reloadAsync() terminates the process, so clearSwitchState()
        // will be called on sandbox app startup (in its _layout.tsx)
        await Updates?.reloadAsync();
      } else {
        // No update available - clean up all state
        await clearSwitchState();
        await SecureStore!.deleteItemAsync(INITIAL_ROUTE_KEY).catch(() => {});
        setIsLoading(false);
      }
    } catch (error) {
      // On error, clean up all state
      await clearSwitchState();
      try {
        await SecureStore!.deleteItemAsync(INITIAL_ROUTE_KEY);
      } catch {
        // Ignore cleanup errors
      }
      setIsLoading(false);
      Alert.alert('Error', `Error switching to Appifex: ${error}`);
    }
  }, []);

  // Auto-detect /preview/ universal links and switch back to companion automatically.
  // This runs in the protected _system component so it works even if +not-found.tsx is overwritten.
  const pathname = usePathname();
  const autoSwitchTriggered = useRef(false);

  useEffect(() => {
    if (!pathname?.startsWith('/preview/') || autoSwitchTriggered.current || isLoading) return;
    if (Platform.OS === 'web' || !SecureStore) return;
    autoSwitchTriggered.current = true;
    performSwitch(pathname);
  }, [pathname, isLoading, performSwitch]);

  const handlePress = useCallback(() => {
    if (isLoading) return;
    if (onPress) {
      onPress();
      return;
    }

    // User interacted — stop periodic peek reminders
    stopPeeking();
    collapsePill();
    Alert.alert(
      'Return to Appifex',
      'You will be switched back to the Appifex app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: performSwitch },
      ]
    );
  }, [onPress, performSwitch, isLoading, collapsePill, stopPeeking]);

  // Ref so PanResponder always calls the latest handlePress without recreation
  const handlePressRef = useRef(handlePress);
  handlePressRef.current = handlePress;

  // --- PanResponder (created once) ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > TAP_THRESHOLD || Math.abs(gs.dy) > TAP_THRESHOLD,
      onPanResponderGrant: () => {
        isDragging.current = false;
        hasInteracted.current = true;
      },
      onPanResponderMove: (_, gs) => {
        if (
          Math.abs(gs.dx) > TAP_THRESHOLD ||
          Math.abs(gs.dy) > TAP_THRESHOLD
        ) {
          isDragging.current = true;
        }
        if (isDragging.current) {
          const b = boundsRef.current;
          const lp = lastPosition.current;
          pan.setValue({
            x: Math.min(Math.max(lp.x + gs.dx, b.minX), b.maxX),
            y: Math.min(Math.max(lp.y + gs.dy, b.minY), b.maxY),
          });
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (isDragging.current) {
          const b = boundsRef.current;
          const lp = lastPosition.current;
          const clampedX = Math.min(Math.max(lp.x + gs.dx, b.minX), b.maxX);
          const clampedY = Math.min(Math.max(lp.y + gs.dy, b.minY), b.maxY);
          // Snap to whichever horizontal edge is closer
          const snapX = (clampedX - b.minX) < (b.maxX - clampedX) ? b.minX : b.maxX;
          setIsOnRight(snapX === b.maxX);
          lastPosition.current = { x: snapX, y: clampedY };
          Animated.spring(pan, {
            toValue: lastPosition.current,
            useNativeDriver: false,
            friction: 7,
          }).start();
        } else {
          handlePressRef.current();
        }
        isDragging.current = false;
      },
    })
  ).current;

  // Don't render in environments where channel switching doesn't work
  // - Web: SecureStore and expo-updates are not supported
  // - Expo Go: Channel switching requires a dev client or standalone build
  // - Standalone builds (TestFlight/App Store): Not inside companion app
  // - isInsideCompanion === null: Still checking SecureStore (hide to avoid flash)
  if (Platform.OS === 'web' || isExpoGo || !Updates || !SecureStore || !isInsideCompanion) {
    return null;
  }

  return (
    <>
      {/* Loading overlay */}
      <Modal visible={isLoading} transparent animationType="fade">
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </Modal>

      {/* Toast bubble above button */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: Animated.subtract(pan.y, TOAST_HEIGHT + TOAST_GAP),
          [isOnRight ? 'right' : 'left']: isOnRight
            ? Animated.subtract(screenWidth, Animated.add(pan.x, size))
            : pan.x,
          opacity: textOpacity,
          zIndex: 1000,
        }}
      >
        <View style={styles.toast}>
          <Text style={styles.toastText}>Tap to go back to Appifex</Text>
        </View>
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.button,
          {
            width: animatedWidth,
            height: size,
            borderRadius: size / 2,
            backgroundColor: isLoading ? 'rgba(153, 153, 153, 0.8)' : 'rgba(255, 255, 255, 0.95)',
            borderWidth: 1,
            borderColor: 'rgba(0, 0, 0, 0.1)',
            left: animatedLeft,
            top: pan.y,
            flexDirection: isOnRight ? 'row-reverse' : 'row',
            paddingLeft: (size - ICON_SIZE) / 2,
            paddingRight: (size - ICON_SIZE) / 2,
          },
          style,
        ]}
      >
        {children || (
          <>
            <Image
              source={require('../assets/images/appifex-icon.png')}
              style={{ width: ICON_SIZE, height: ICON_SIZE, borderRadius: ICON_SIZE / 2 }}
              resizeMode="cover"
            />
            <Animated.View style={{
              width: textWidth,
              opacity: textOpacity,
              overflow: 'hidden',
              justifyContent: 'center',
              [isOnRight ? 'marginRight' : 'marginLeft']: textMargin,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isOnRight ? 'flex-end' : 'flex-start' }}>
                {isOnRight && <Ionicons name="arrow-undo" size={12} color="#333" style={{ marginRight: 3 }} />}
                <Text style={styles.label}>Appifex</Text>
                {!isOnRight && <Ionicons name="arrow-redo" size={12} color="#333" style={{ marginLeft: 3 }} />}
              </View>
            </Animated.View>
          </>
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    zIndex: 999,
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  toast: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

// Default export for compatibility with both import styles:
// import { AppifexFloatingButton } from '...' (named)
// import AppifexFloatingButton from '...' (default)
export default AppifexFloatingButton;
