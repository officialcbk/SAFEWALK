import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Renders a show/hide toggle and masks the value. */
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  isPassword,
  secureTextEntry,
  multiline,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="flex flex-col gap-1.5">
      {label && (
        <Text className="text-xs font-semibold text-gray-text tracking-wide">{label}</Text>
      )}
      <View className="relative justify-center">
        <TextInput
          multiline={multiline}
          className={[
            'w-full px-3.5 text-[15px] text-dark-text bg-white border rounded-md font-sans',
            multiline ? 'min-h-[110px] py-3' : 'h-[52px]',
            isPassword ? 'pr-11' : '',
            error ? 'border-sos' : 'border-gray-border',
          ].join(' ')}
          placeholderTextColor="#888899"
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            className="absolute right-3 p-1.5"
            hitSlop={8}
          >
            {showPassword ? (
              <EyeOff size={16} color="#888899" />
            ) : (
              <Eye size={16} color="#888899" />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text className="text-xs text-status-danger">{error}</Text>
      ) : helperText ? (
        <Text className="text-xs text-gray-text">{helperText}</Text>
      ) : null}
    </View>
  );
}
