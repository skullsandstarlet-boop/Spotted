import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

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
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  );
}
