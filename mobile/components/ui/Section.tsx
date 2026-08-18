import { View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from '@/components/ui/Text';

interface SectionProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function Section({ children, title, subtitle, className }: SectionProps) {
  return (
    <View className={cn('gap-3', className)}>
      {(title || subtitle) && (
        <View>
          {title && <Text className="text-lg font-semibold">{title}</Text>}
          {subtitle && <Text className="text-sm text-text-secondary mt-1">{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}
