import { Pressable } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { Text, TextClassContext } from '@/components/ui/Text';

const buttonVariants = cva(
  'flex-row gap-2 rounded-xl items-center justify-center active:opacity-80',
  {
    variants: {
      variant: {
        primary: 'bg-primary',
        secondary: 'bg-surface',
        destructive: 'bg-error',
        ghost: 'bg-transparent',
      },
      size: {
        default: 'py-3.5 px-6',
        sm: 'py-2 px-4',
        lg: 'py-4 px-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

const buttonTextVariants = cva('font-semibold', {
  variants: {
    variant: {
      primary: 'text-on-primary',
      secondary: 'text-text',
      destructive: 'text-on-primary',
      ghost: 'text-primary',
    },
    size: {
      default: 'text-base',
      sm: 'text-sm',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'default',
  },
});

type ButtonProps = React.ComponentProps<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({ children, variant, size, className, disabled, ...props }: ButtonProps) {
  const textClass = buttonTextVariants({ variant, size });

  return (
    <TextClassContext.Provider value={textClass}>
      <Pressable
        disabled={disabled}
        className={cn(
          buttonVariants({ variant, size }),
          disabled && 'opacity-50',
          className,
        )}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text className={textClass}>{children}</Text>
        ) : (
          children
        )}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonVariants, buttonTextVariants };
export type { ButtonProps };
