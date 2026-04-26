// ─── App shell ────────────────────────────────────────────────────────────────
// Slice  1  – /walk route (baseline)
// Slice 10  – /contacts route + nav link
// Slice 12  – /share/:sessionId route (no nav link – public short URL)
// Slice 15  – React.lazy code-splitting for all page chunks
// Slice 16  – skip-to-content link, nav landmark roles
// Slice 17  – /settings route + nav link

import { lazy, Suspense, useEffect } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { ensureAnonymousAuth } from "./services/db";
import "./styles/WalkPage.css"; // loads the shimmer + skip-link keyframes globally

// Lazy-load every page so the initial bundle stays small (Slice 15)
const WalkPage     = lazy(() => import("./pages/WalkPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const SharePage    = lazy(() => import("./pages/SharePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

/**
 * Minimal skeleton shown while a page chunk is loading.
 * Matches the sw-page-skeleton styles in WalkPage.css (Slice 15).
 */
function PageSkeleton() {
  return (
    <div className="sw-page-skeleton" aria-busy="true" aria-label="Loading page…">
      <div className="sw-page-skeleton-bar sw-page-skeleton-bar--wide" />
      <div className="sw-page-skeleton-bar" />
      <div className="sw-page-skeleton-bar sw-page-skeleton-bar--short" />
    </div>
  );
}

function App() {
  useEffect(() => { ensureAnonymousAuth(); }, []);

  return (
    <div className="sw-app">
      {/* Skip link – lets keyboard users jump past the nav (Slice 16) */}
      <a href="#sw-main-content" className="sw-skip-link">
        Skip to main content
      </a>

      <header className="sw-header" role="banner">
        <div className="sw-header-left">
          <div className="sw-logo-orb" aria-hidden="true">
            <div className="sw-logo-inner" />
          </div>
          <div className="sw-brand-text">
            <div className="sw-brand-title">SafeWalk</div>
            <div className="sw-brand-subtitle">Stay safer on every walk</div>
          </div>
        </div>

        {/* Primary navigation (Slice 10, 17) */}
        <nav className="sw-nav" aria-label="Main navigation">
          <NavLink
            to="/walk"
            className={({ isActive }) =>
              isActive ? "sw-nav-link sw-nav-link--active" : "sw-nav-link"
            }
          >
            Walk
          </NavLink>
          <NavLink
            to="/contacts"
            className={({ isActive }) =>
              isActive ? "sw-nav-link sw-nav-link--active" : "sw-nav-link"
            }
          >
            Contacts
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive ? "sw-nav-link sw-nav-link--active" : "sw-nav-link"
            }
          >
            Settings
          </NavLink>
        </nav>
      </header>

      <main className="sw-main" id="sw-main-content">
        <div className="sw-main-inner">
          {/* Suspense boundary with skeleton for lazy page loads (Slice 15) */}
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/walk"                element={<WalkPage />}     />
              <Route path="/contacts"            element={<ContactsPage />} />
              {/* /share/:sessionId – public link, no nav entry (Slice 12) */}
              <Route path="/share/:sessionId"    element={<SharePage />}    />
              <Route path="/settings"            element={<SettingsPage />} />
              {/* Default fallback */}
              <Route path="*"                    element={<WalkPage />}     />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default App;
