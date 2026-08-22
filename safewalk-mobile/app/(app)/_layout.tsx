import { Tabs } from 'expo-router';
import { Home, Users, History, Settings } from 'lucide-react-native';
import { useWalkStore } from '../../store/walkStore';

const ACTIVE = '#534AB7';
const MUTED = '#888899';

export default function AppTabsLayout() {
  const isWalking = useWalkStore((s) => !!s.walk.sessionId);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: isWalking
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
    </Tabs>
  );
}
