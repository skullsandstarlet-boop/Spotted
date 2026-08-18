import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { gapClass, type GapSize } from './layout-utils';

/**
 * Horizontal stack for small inline elements (icons, badges, buttons).
 * Do NOT use for items wider than ~150px — use VStack instead.
 */
interface HStackProps {
  children: React.ReactNode;
  gap?: GapSize;
  className?: string;
}

export function HStack({ children, gap = 'sm', className }: HStackProps) {
  return (
    <View className={cn('flex-row items-center', gapClass[gap], className)}>
      {children}
    </View>
  );
}
