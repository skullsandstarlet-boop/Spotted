import { Tabs } from 'expo-router';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="index"
      // CRITICAL: DO NOT REMOVE this tabBar prop — it auto-hides the tab bar when ≤1 visible tab.
      // Copy this exact pattern when rewriting this file. Single-tab bars look broken without it.
      tabBar={(props) => {
        const visibleRoutes = props.state.routes.filter((route) => {
          const options = props.descriptors[route.key]?.options as { href?: string | null } | undefined;
          return options?.href !== null;
        });
        if (visibleRoutes.length <= 1) {
          return <View style={{ paddingBottom: insets.bottom }} />;
        }
        return <BottomTabBar {...props} />;
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Nearby',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="eye" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: 'Spot',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
