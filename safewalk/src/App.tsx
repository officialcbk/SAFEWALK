import { lazy, Suspense } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { FullPageSpinner } from './components/ui/Spinner';

// Auth (public)
const SignIn          = lazy(() => import('./pages/auth/SignIn'));
const SignUp          = lazy(() => import('./pages/auth/SignUp'));
const ForgotPassword  = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword   = lazy(() => import('./pages/auth/ResetPassword'));
const CheckEmail      = lazy(() => import('./pages/auth/CheckEmail'));
const AuthCallback    = lazy(() => import('./pages/auth/AuthCallback'));

// Onboarding (protected, first-time only)
const OnboardingFlow  = lazy(() => import('./pages/onboarding/OnboardingFlow'));

// Main app (protected)
const Home            = lazy(() => import('./pages/Home'));
const Contacts        = lazy(() => import('./pages/Contacts'));
const History         = lazy(() => import('./pages/History'));
const Settings        = lazy(() => import('./pages/Settings'));

// Public share view
const ContactWebView  = lazy(() => import('./pages/ContactWebView'));

// Landing page
const LandingPage     = lazy(() => import('./pages/landing/LandingPage'));

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Landing page */}
        <Route path="/"                 element={<LandingPage />} />

        {/* Public auth routes */}
        <Route path="/sign-in"          element={<SignIn />} />
        <Route path="/sign-up"          element={<SignUp />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/auth/check-email" element={<CheckEmail />} />
        <Route path="/auth/callback"    element={<AuthCallback />} />

        {/* Public trusted contact view */}
        <Route path="/track/:token"     element={<ContactWebView />} />

        {/* Onboarding — public, IS the sign-up flow */}
        <Route path="/onboarding" element={<OnboardingFlow />} />

        {/* /sign-up redirects into the onboarding flow */}
        <Route path="/sign-up" element={<Navigate to="/onboarding" replace />} />

        {/* Protected main app */}
        <Route path="/home"      element={<Protected><Home /></Protected>} />
        <Route path="/contacts"  element={<Protected><Contacts /></Protected>} />
        <Route path="/history"   element={<Protected><History /></Protected>} />
        <Route path="/settings"  element={<Protected><Settings /></Protected>} />

        {/* Default */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
