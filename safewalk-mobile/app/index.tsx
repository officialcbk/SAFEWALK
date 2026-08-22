import { Redirect } from 'expo-router';

// Entry point — AuthGate (root layout) takes over from here and sends the
// user to /home or /onboarding if a session already exists.
export default function Index() {
  return <Redirect href="/sign-in" />;
}
