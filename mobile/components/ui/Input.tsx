import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { colors } from '@/theme/colors';

interface InputProps extends Omit<TextInputProps, 'className'> {
  className?: string;
}

export function Input({ className, ...props }: InputProps) {
  return (
    <TextInput
      className={cn(
        'bg-input rounded-xl px-4 py-4 text-base text-text',
        className,
      )}
      placeholderTextColor={colors.textTertiary}
      {...props}
    />
  );
}
