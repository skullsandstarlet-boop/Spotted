import { Modal, Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text, TextClassContext } from '@/components/ui/Text';

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Dialog({ visible, onClose, children }: DialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-center items-center"
        onPress={onClose}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TextClassContext.Provider value="text-text">
      <View className={cn('bg-surface-elevated rounded-2xl p-6 mx-8 min-w-72', className)}>
        {children}
      </View>
    </TextClassContext.Provider>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={cn('mb-4', className)}>{children}</View>;
}

export function DialogTitle({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Text className={cn('text-lg font-semibold', className)}>
      {children}
    </Text>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <Text className={cn('text-sm text-text-secondary mt-1', className)}>
      {children}
    </Text>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('flex-row justify-end gap-3 mt-6', className)}>
      {children}
    </View>
  );
}

export function DialogClose({
  children,
  onPress,
  className,
}: {
  children: string;
  onPress: () => void;
  className?: string;
}) {
  return (
    <Pressable onPress={onPress} className={cn('py-2 px-4', className)}>
      <Text className="text-primary font-medium">{children}</Text>
    </Pressable>
  );
}
