// ─── Auth deep-link handler ───────────────────────────────────────────────────
// RN port of the web app's AuthCallback: web relies on supabase-js parsing the
// session straight out of the URL (detectSessionInUrl). We disabled that for
// RN (there's no window.location), so this screen parses the incoming
// safewalk:// deep link itself and exchanges it for a session. Once the
// session lands in authStore, AuthGate (mounted at the root) takes over and
// routes to /onboarding or /home — this screen doesn't navigate itself.

import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { FullPageSpinner } from '../../components/ui/Spinner';
import { AuthPage } from '../../components/layout/AuthPage';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';

function extractParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [, query = ''] = url.split('?');
  const [beforeHash, hash = ''] = query.split('#');
  for (const part of `${beforeHash}&${hash}`.split('&')) {
    if (!part) continue;
    const [key, value] = part.split('=');
    if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  // Some links put the token fragment directly after the path, e.g. safewalk://callback#access_token=…
  const rawHashIndex = url.indexOf('#');
  if (rawHashIndex !== -1) {
    for (const part of url.slice(rawHashIndex + 1).split('&')) {
      const [key, value] = part.split('=');
      if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

export default function AuthCallback() {
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    (async () => {
      const params = extractParams(url);

      if (params.access_token && params.refresh_token) {
        const { error: err } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (err) setError(err.message);
        return;
      }

      if (params.code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(params.code);
        if (err) setError(err.message);
        return;
      }

      setError('This link is missing its login token. Try requesting a new one.');
    })();
  }, [url]);

  if (error) {
    return (
      <AuthPage>
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-base font-sans-bold text-ink text-center">Sign-in link didn&apos;t work</Text>
          <Text className="text-sm font-sans text-black/50 text-center leading-relaxed">{error}</Text>
          <Link href="/sign-in" className="text-sm font-sans-semibold text-ink">
            Back to sign in
          </Link>
        </View>
      </AuthPage>
    );
  }

  return <FullPageSpinner />;
}
