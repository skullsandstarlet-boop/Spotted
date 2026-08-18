import { Pressable } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

interface ChipProps {
  children: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Chip({ children, selected = false, onPress, className }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'px-4 py-2 rounded-full',
        selected ? 'bg-primary' : 'bg-surface',
        className,
      )}
      style={{ alignSelf: 'flex-start' }}
    >
      <Text
        className={cn(
          'text-sm font-medium',
          selected ? 'text-primary-foreground' : 'text-text',
        )}
      >
        {children}
      </Text>
    </Pressable>
  );
}
