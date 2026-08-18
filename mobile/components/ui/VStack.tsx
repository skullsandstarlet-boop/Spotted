import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { gapClass, type GapSize } from './layout-utils';

interface VStackProps {
  children: React.ReactNode;
  gap?: GapSize;
  className?: string;
}

export function VStack({ children, gap = 'md', className }: VStackProps) {
  return (
    <View className={cn(gapClass[gap], className)}>
      {children}
    </View>
  );
}
