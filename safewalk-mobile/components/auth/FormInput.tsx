import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

/** Monochrome text input for the auth screens — matches the rest of the app's black/white system. */
export function FormInput({
  label, error, isPassword, ...props
}: {
  label: string;
  error?: string;
  isPassword?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View className="gap-1.5">
      <Text className="font-mono-medium text-[10px] tracking-wider uppercase text-black/45">{label}</Text>
      <View className="justify-center">
        <TextInput
          className={[
            'w-full h-[52px] px-3.5 text-[15px] text-ink bg-white border rounded-xl font-sans',
            isPassword ? 'pr-11' : '',
            error ? 'border-alert' : 'border-black/12',
          ].join(' ')}
          placeholderTextColor="rgba(0,0,0,.35)"
          secureTextEntry={isPassword ? !showPassword : props.secureTextEntry}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            className="absolute right-3.5"
            hitSlop={8}
          >
            {showPassword ? <EyeOff size={17} color="rgba(0,0,0,.4)" /> : <Eye size={17} color="rgba(0,0,0,.4)" />}
          </Pressable>
        )}
      </View>
      {error ? <Text className="text-xs text-alert">{error}</Text> : null}
    </View>
  );
}
