import { Switch } from 'react-native';

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ on, onChange }: ToggleProps) {
  return (
    <Switch
      value={on}
      onValueChange={onChange}
      trackColor={{ false: '#C8C8D4', true: '#7F77DD' }}
      thumbColor="white"
      ios_backgroundColor="#C8C8D4"
    />
  );
}
