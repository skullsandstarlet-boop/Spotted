import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { cn } from '@/lib/cn';
import { StyledSafeAreaView } from '@/lib/styled';

interface ContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  keyboard?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  className?: string;
  contentClassName?: string;
}

export function Container({
  children,
  scroll = true,
  keyboard = false,
  edges = ['top'],
  className,
  contentClassName,
}: ContainerProps) {
  const content = (
    <View className={cn('px-5 pt-4 pb-6', contentClassName)}>
      {children}
    </View>
  );

  const shouldScroll = scroll || keyboard;

  const scrollContent = shouldScroll ? (
    <ScrollView
      style={{ flex: 1 }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={keyboard ? { flexGrow: 1 } : { paddingBottom: 20 }}
    >
      {content}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>
      {content}
    </View>
  );

  return (
    <StyledSafeAreaView className={cn('flex-1 bg-background', className)} edges={edges}>
      {keyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {scrollContent}
        </KeyboardAvoidingView>
      ) : (
        scrollContent
      )}
    </StyledSafeAreaView>
  );
}
