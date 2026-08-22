import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'ghost' | 'danger' | 'text';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: string;
}

const containerVariants: Record<Variant, string> = {
  primary: 'bg-purple-400',
  ghost: 'bg-purple-50 border border-purple-100',
  danger: 'bg-sos',
  text: 'bg-transparent',
};

const textVariants: Record<Variant, string> = {
  primary: 'text-white',
  ghost: 'text-purple-600',
  danger: 'text-white',
  text: 'text-purple-600',
};

const sizes: Record<Size, string> = {
  sm: 'h-10 px-4',
  md: 'h-[52px] px-5',
  lg: 'h-[52px] px-6',
};

const textSizes: Record<Size, string> = {
  sm: 'text-[13px]',
  md: 'text-[16px]',
  lg: 'text-[16px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps & { className?: string }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center gap-2 rounded-md',
        containerVariants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-45' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#534AB7'}
        />
      )}
      <Text className={['font-semibold', textVariants[variant], textSizes[size]].join(' ')}>
        {children}
      </Text>
    </Pressable>
  );
}
