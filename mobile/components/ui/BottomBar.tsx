import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/cn';

interface BottomBarProps {
  children: React.ReactNode;
  className?: string;
}

export function BottomBar({ children, className }: BottomBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('px-5 pt-3 bg-background border-t border-border', className)}
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});
