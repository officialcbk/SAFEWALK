import { Text, View } from 'react-native';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber';

interface BadgeProps {
  variant?: Variant;
  children: string;
}

const variants: Record<Variant, { bg: string; text: string }> = {
  success: { bg: 'bg-status-safe-bg', text: 'text-status-safe' },
  warning: { bg: 'bg-status-warn-bg', text: 'text-status-warn' },
  amber: { bg: 'bg-status-warn-bg', text: 'text-status-warn' },
  danger: { bg: 'bg-status-danger-bg', text: 'text-status-danger' },
  info: { bg: 'bg-purple-50', text: 'text-purple-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
};

export function Badge({ variant = 'purple', children }: BadgeProps) {
  const v = variants[variant];
  return (
    <View className={`flex-row items-center h-[22px] px-2 rounded-full ${v.bg}`}>
      <Text className={`text-[11px] font-semibold ${v.text}`}>{children}</Text>
    </View>
  );
}
