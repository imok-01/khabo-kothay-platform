import { NavLink } from 'react-router-dom';
import { Home, Compass, Bookmark, UserRound, ShieldCheck, Store } from 'lucide-react';
import { useSaved } from '../context/SavedContext';
import { useAuth } from '../context/AuthContext';

/**
 * Mobile-only bottom navigation (hidden above 820px via CSS).
 * Mirrors the desktop header destinations so nothing is lost on small screens.
 */
export default function MobileNav() {
  const { savedIds } = useSaved();
  const { session } = useAuth();

  return (
    <nav className="mobile-nav" aria-label="Primary (mobile)">
      <div className="mobile-nav__links">
        <NavLink to="/discover" className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}>
          <Home size={20} aria-hidden="true" />
          Discover
        </NavLink>
        <NavLink to="/explore" className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}>
          <Compass size={20} aria-hidden="true" />
          Explore
        </NavLink>
        <NavLink to="/saved" className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}>
          <Bookmark size={20} aria-hidden="true" />
          Saved
          {savedIds.length > 0 && <span className="nav__badge mobile-nav__badge">{savedIds.length}</span>}
        </NavLink>
        {session?.role === 'executive' ? (
          <NavLink to="/admin" className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}>
            <ShieldCheck size={20} aria-hidden="true" />
            Admin
          </NavLink>
        ) : session?.role === 'restaurant_admin' ? (
          <NavLink to="/manage" className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}>
            <Store size={20} aria-hidden="true" />
            Manage
          </NavLink>
        ) : (
          <NavLink to={session ? '/profile' : '/login'} className={({ isActive }) => `mobile-nav__link ${isActive ? 'mobile-nav__link--active' : ''}`}>
            <UserRound size={20} aria-hidden="true" />
            {session ? 'You' : 'Sign in'}
          </NavLink>
        )}
      </div>
    </nav>
  );
}
