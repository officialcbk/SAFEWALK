import { Tabs, useSegments } from 'expo-router';
import { useWalkStore } from '../../store/walkStore';
import { TrailTabBar } from '../../components/nav/TrailTabBar';

// Full-screen routes with no tab chrome — same treatment as an active walk.
const CHROMELESS_ROUTES = new Set([
  'walk-confirm',
  'walk-summary',
  'search',
  'walk-detail',
  'profile',
  'account-security',
  'account-app-settings',
  'account-notifications',
  'account-safety',
  'account-emergency',
  'account-places',
  'account-privacy',
  'account-help',
  'account-legal',
]);

export default function AppTabsLayout() {
  const isWalking = useWalkStore((s) => !!s.walk.sessionId);
  const segments = useSegments();
  const currentRoute = segments[segments.length - 1];
  const hideTabBar = isWalking || CHROMELESS_ROUTES.has(currentRoute);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (hideTabBar ? null : <TrailTabBar {...props} />)}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="contacts" options={{ title: 'Contacts' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Account' }} />
      <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="walk-confirm" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="walk-summary" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="search" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="walk-detail" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-security" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-app-settings" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-safety" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-emergency" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-places" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-privacy" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-help" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="account-legal" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
