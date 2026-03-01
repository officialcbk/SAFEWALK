import { NavLink, Route, Routes } from "react-router-dom";
import WalkPage from "./pages/WalkPage";

function App() {
  return (
    <div className="sw-app">
      <header className="sw-header">
        <div className="sw-header-left">
          <div className="sw-logo-orb">
            <div className="sw-logo-inner" />
          </div>
          <div className="sw-brand-text">
            <div className="sw-brand-title">SafeWalk</div>
            <div className="sw-brand-subtitle">Stay safer on every walk</div>
          </div>
        </div>

        <nav className="sw-nav">
          <NavLink
            to="/walk"
            className={({ isActive }: { isActive: boolean }) =>
            isActive ? "sw-nav-link sw-nav-link--active" : "sw-nav-link"
            }
          >
            Walk
          </NavLink>
        </nav>
      </header>

      <main className="sw-main">
        <div className="sw-main-inner">
          <Routes>
            <Route path="/walk" element={<WalkPage />} />
            <Route path="*" element={<WalkPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
