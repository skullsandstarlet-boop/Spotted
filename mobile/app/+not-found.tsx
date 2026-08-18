import { Stack, useRouter, usePathname } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  // Preview URLs are handled by AppifexFloatingButton's auto-switch.
  // Show a friendly loading state while the switch happens.
  if (pathname?.startsWith('/preview/')) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <View className="flex-1 justify-center items-center bg-background">
          <ActivityIndicator size="large" color="#00D632" />
          <Text className="text-base text-text-secondary mt-4">Switching to Appifex...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View className="flex-1 justify-center items-center px-8 bg-background">
        <View className="w-20 h-20 rounded-full bg-surface items-center justify-center mb-5">
          <Ionicons name="alert-circle-outline" size={36} color="#FF3B30" />
        </View>
        <Text className="text-xl font-semibold mb-2 text-center text-[#FF3B30]">
          This screen does not exist.
        </Text>
        <Text className="text-text-secondary mb-8 leading-6 text-center">
          Check the route path or return to the Home tab.
        </Text>
        <View className="w-full max-w-[300px]">
          <Button onPress={() => router.replace('/')}>Go back</Button>
        </View>
      </View>
    </>
  );
}
