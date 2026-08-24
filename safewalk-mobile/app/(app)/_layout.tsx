import { Tabs, useSegments } from 'expo-router';
import { Home, Users, History, Settings } from 'lucide-react-native';
import { useWalkStore } from '../../store/walkStore';

const ACTIVE = '#534AB7';
const MUTED = '#888899';
// Full-screen routes with no tab chrome — same treatment as an active walk.
const CHROMELESS_ROUTES = new Set(['walk-confirm', 'walk-summary']);

export default function AppTabsLayout() {
  const isWalking = useWalkStore((s) => !!s.walk.sessionId);
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1];
  const hideTabBar = isWalking || CHROMELESS_ROUTES.has(currentRoute);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: hideTabBar
          ? { display: 'none' }
          : { height: 78, paddingTop: 8, paddingBottom: 22, borderTopColor: '#E0E0E8' },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ title: 'Contacts', tabBarIcon: ({ color }) => <Users size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color }) => <History size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }}
      />
      <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="walk-confirm" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="walk-summary" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
