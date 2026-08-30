import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Users, History, User } from 'lucide-react-native';

// A minimal shape of expo-router's tabBar render props — just what's used
// here. The full BottomTabBarProps type from @react-navigation/bottom-tabs
// doesn't structurally match expo-router's own (slightly different
// ColorValue/HeaderOptions generics), so importing it directly fails to
// typecheck against what <Tabs tabBar={...}> actually passes in.
interface TrailTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: any;
}

const TAB_META: Record<string, { label: string; Icon: typeof Home }> = {
  home: { label: 'Home', Icon: Home },
  contacts: { label: 'Contacts', Icon: Users },
  history: { label: 'History', Icon: History },
  settings: { label: 'Account', Icon: User },
};

const VISIBLE_ROUTES = ['home', 'contacts', 'history', 'settings'];

// Uber/Lyft-style tab bar: four items centered as one group with fixed gaps,
// not spread edge to edge like RN's default flex-1-per-item layout â hence a
// fully custom renderer instead of `tabBarStyle`/`tabBarItemStyle` tweaks.
export function TrailTabBar({ state, navigation }: TrailTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedName = state.routes[state.index]?.name;
  const dark = focusedName === 'home';

  const activeColor = dark ? '#fff' : '#0A0A0A';
  const inactiveGlyph = dark ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.3)';
  const inactiveLabel = dark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.4)';

  return (
    <View
      style={{
        backgroundColor: dark ? '#0A0A0A' : '#fff',
        borderTopWidth: 1,
        borderTopColor: dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)',
        paddingTop: 11,
        paddingBottom: Math.max(insets.bottom, 12) + 8,
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'center',
      }}
    >
      {VISIBLE_ROUTES.map((name, i) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return null;
        const meta = TAB_META[name];
        const focused = focusedName === name;
        const color = focused ? activeColor : inactiveGlyph;
        return (
          <Pressable
            key={name}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ alignItems: 'center', gap: 6, marginLeft: i === 0 ? 0 : 40 }}
          >
            <meta.Icon size={16} color={color} strokeWidth={2} />
            <Text
              style={{
                fontFamily: 'Archivo_600SemiBold',
                fontSize: 9.5,
                lineHeight: 11,
                color: focused ? activeColor : inactiveLabel,
              }}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
