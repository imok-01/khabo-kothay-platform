import { NavLink } from 'react-router-dom';
import { Home, Compass, SlidersHorizontal, Library, UserRound, ShieldCheck, Store } from 'lucide-react';
import { useSaved } from '../context/SavedContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';

/**
 * Mobile-only bottom navigation (hidden above 820px via CSS).
 *
 * It now mirrors the header's destinations exactly, which it previously did
 * not: there was no route to the homepage at all, the `/discover` tab carried
 * a Home icon and `/explore` carried a Compass, so the two icons described the
 * wrong screens. Saved is now Collection — the same single area the header
 * points at, holding both Saved and Favourites.
 *
 * Four slots, and the fourth is role-dependent, so an owner or admin still
 * reaches their own surface without a fifth cramped tab.
 */
export default function MobileNav() {
  const { savedIds } = useSaved();
  const { favoriteIds } = useFavorites();
  const { session } = useAuth();

  // Union, not sum: a restaurant can be both saved and favourited.
  const collectionCount = new Set([...savedIds, ...favoriteIds]).size;

  const cls = ({ isActive }: { isActive: boolean }) =>
    `mobile-nav__link mobile-nav__item ${isActive ? 'mobile-nav__item--on' : ''}`;

  return (
    <nav className="mobile-nav" aria-label="Primary (mobile)">
      <div className="mobile-nav__links">
        <NavLink to="/" end className={cls}>
          <Home size={20} aria-hidden="true" />
          Home
        </NavLink>
        <NavLink to="/discover" className={cls}>
          <Compass size={20} aria-hidden="true" />
          Discover
        </NavLink>
        <NavLink to="/explore" className={cls}>
          <SlidersHorizontal size={20} aria-hidden="true" />
          Explore
        </NavLink>
        {session?.role === 'executive' ? (
          <NavLink to="/admin" className={cls}>
            <ShieldCheck size={20} aria-hidden="true" />
            Admin
          </NavLink>
        ) : session?.role === 'restaurant_admin' ? (
          <NavLink to="/manage" className={cls}>
            <Store size={20} aria-hidden="true" />
            Manage
          </NavLink>
        ) : session ? (
          <NavLink to="/saved" className={cls}>
            <Library size={20} aria-hidden="true" />
            Collection
            {collectionCount > 0 && <span className="mobile-nav__badge">{collectionCount}</span>}
          </NavLink>
        ) : collectionCount > 0 ? (
          /* A signed-out visitor who has already kept something keeps their
             route to it; only an empty-handed guest gets the sign-in slot. */
          <NavLink to="/saved" className={cls}>
            <Library size={20} aria-hidden="true" />
            Collection
            <span className="mobile-nav__badge">{collectionCount}</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={cls}>
            <UserRound size={20} aria-hidden="true" />
            Sign in
          </NavLink>
        )}
      </div>
    </nav>
  );
}
