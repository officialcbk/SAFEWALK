import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'ghost' | 'danger' | 'text' | 'dark' | 'ghost-dark';
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
  // Purple-free variants for the account section — a Tailwind utility
  // conflict means overriding containerVariants.primary's bg via an
  // appended className is not reliable (whichever color class the compiled
  // stylesheet happens to define later wins, regardless of string order),
  // so these need to be real variants rather than a className override.
  dark: 'bg-ink',
  'ghost-dark': 'bg-fill',
};

const textVariants: Record<Variant, string> = {
  primary: 'text-white',
  ghost: 'text-purple-600',
  danger: 'text-white',
  text: 'text-purple-600',
  dark: 'text-white',
  'ghost-dark': 'text-ink',
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
          color={variant === 'primary' || variant === 'danger' || variant === 'dark' ? '#FFFFFF' : variant === 'ghost-dark' ? '#0A0A0A' : '#534AB7'}
        />
      )}
      <Text className={['font-semibold', textVariants[variant], textSizes[size]].join(' ')}>
        {children}
      </Text>
    </Pressable>
  );
}
