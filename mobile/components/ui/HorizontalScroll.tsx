import { ScrollView, View } from 'react-native';

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className }: HorizontalScrollProps) {
  return (
    <View className={className}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 12, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 8 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
