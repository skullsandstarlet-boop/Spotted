import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { shadows } from '@/theme/shadows';
import { Text, TextClassContext } from '@/components/ui/Text';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <TextClassContext.Provider value="text-text">
      <View className={cn('bg-surface-elevated rounded-2xl', className)} style={shadows.md}>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <View className={cn('px-6 pt-6 pb-2', className)}>{children}</View>;
}

export function CardTitle({ children, className }: { children: string; className?: string }) {
  return <Text className={cn('text-lg font-semibold', className)}>{children}</Text>;
}

export function CardDescription({ children, className }: { children: string; className?: string }) {
  return <Text className={cn('text-sm text-text-secondary mt-1', className)}>{children}</Text>;
}

export function CardContent({ children, className }: CardProps) {
  return <View className={cn('px-6 py-4', className)}>{children}</View>;
}

export function CardFooter({ children, className }: CardProps) {
  return <View className={cn('px-6 pb-6 pt-2 flex-row justify-end gap-3', className)}>{children}</View>;
}
