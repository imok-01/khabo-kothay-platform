import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Soup, Heart, Bookmark, Menu, X, UserCircle2, ShieldCheck, Store, Info, UtensilsCrossed, Compass, BookOpen, PenLine, LogOut, Settings, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useSaved } from '../context/SavedContext';
import { useAuth } from '../context/AuthContext';
import { roleViewOf, type RoleView } from '../domain/auth';
import { useOwnerRestaurant } from '../hooks/useOwnerRestaurant';
import { useRestaurants } from '../hooks/useRestaurants';
import SearchBar from './SearchBar';

/**
 * Role-aware primary navigation.
 *
 *   guest            → Home · Explore · Sign in
 *   customer         → Home · Explore · Favourites · Saved · account menu
 *   restaurant_owner → Dashboard · My restaurant · Update information · account menu
 *   admin            → Home · Explore · Admin · account menu
 *
 * The hamburger (right, every width) opens the same grouped drawer for all
 * roles; account actions (settings, sign out) live only inside the account
 * menu — never permanently in the bar.
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { favoriteIds } = useFavorites();
  const { savedIds } = useSaved();
  const { session, user, logout } = useAuth();
  const { data: restaurantData } = useRestaurants();

  const view: RoleView = roleViewOf(session?.role);
  const signedIn = Boolean(session);
  const firstOwnedRestaurant = useOwnerRestaurant(session?.restaurantIds);
  const ownerRestaurantPath = firstOwnedRestaurant ? `/restaurant/${firstOwnedRestaurant.id}` : '/manage';

  // Drawer: close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Account menu: close on outside click or Escape.
  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  const handleLogout = () => {
    setAccountOpen(false);
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  /** Items inside the account dropdown, per role. */
  const accountItems = (() => {
    if (view === 'restaurant_owner') {
      return [
        { to: ownerRestaurantPath, label: 'Restaurant profile', icon: Store },
        { to: '/manage', label: 'Manage listing', icon: LayoutDashboard },
        { to: '/manage?tab=profile', label: 'Update requests', icon: PenLine },
        { to: '/profile', label: 'Account settings', icon: Settings },
      ];
    }
    if (view === 'admin') {
      return [
        { to: '/admin', label: 'Admin dashboard', icon: LayoutDashboard },
        { to: '/profile', label: 'Account settings', icon: Settings },
      ];
    }
    // customer
    return [
      { to: '/profile', label: 'Profile', icon: UserCircle2 },
      { to: '/saved', label: 'Saved restaurants', icon: Bookmark },
      { to: '/favorites', label: 'Favourites', icon: Heart },
      { to: '/profile', label: 'Settings', icon: Settings },
    ];
  })();

  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="nav__brand" onClick={() => {
            setMenuOpen(false);
            // Clicking the brand while already on the homepage should scroll to
            // the top — the router only scrolls when the pathname changes.
            if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <span className="nav__logo" aria-hidden="true"><Soup size={20} /></span>
            <span className="nav__wordmark">
              <strong>Khabo Kothay BD</strong>
              <small>Dhaka · where to eat</small>
            </span>
          </Link>

          <SearchBar variant="nav" restaurants={restaurantData ?? []} />

          <nav className="nav__links" aria-label="Main navigation">
            {view === 'guest' && (
              <>
                <NavLink to="/" end className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Home</NavLink>
                <NavLink to="/explore" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Explore</NavLink>
                <NavLink to="/discover" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Discover</NavLink>
              </>
            )}
            {view === 'customer' && (
              <>
                <NavLink to="/" end className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Home</NavLink>
                <NavLink to="/explore" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Explore</NavLink>
                <NavLink to="/discover" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Discover</NavLink>
                <NavLink to="/favorites" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
                  <Heart size={15} aria-hidden="true" />
                  Favourites
                  {favoriteIds.length > 0 && <span className="nav__badge">{favoriteIds.length}</span>}
                </NavLink>
                <NavLink to="/saved" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
                  <Bookmark size={15} aria-hidden="true" />
                  Saved
                  {savedIds.length > 0 && <span className="nav__badge">{savedIds.length}</span>}
                </NavLink>
              </>
            )}
            {view === 'restaurant_owner' && (
              <>
                <NavLink to="/manage" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
                  <LayoutDashboard size={15} aria-hidden="true" /> Dashboard
                </NavLink>
                <NavLink to={ownerRestaurantPath} className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
                  <Store size={15} aria-hidden="true" /> My restaurant
                </NavLink>
                <NavLink to="/manage?tab=profile" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>
                  <PenLine size={15} aria-hidden="true" /> Update information
                </NavLink>
              </>
            )}
            {view === 'admin' && (
              <>
                <NavLink to="/" end className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Home</NavLink>
                <NavLink to="/explore" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Explore</NavLink>
                <NavLink to="/discover" className={({ isActive }) => `nav__link ${isActive ? 'nav__link--active' : ''}`}>Discover</NavLink>
                <NavLink to="/admin" className={({ isActive }) => `nav__link nav__link--role ${isActive ? 'nav__link--active' : ''}`}>
                  <ShieldCheck size={15} aria-hidden="true" /> Admin
                </NavLink>
              </>
            )}

            {signedIn ? (
              <div className="nav__account" ref={accountRef}>
                <button
                  type="button"
                  className={`nav__account-trigger ${accountOpen ? 'nav__account-trigger--open' : ''}`}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  onClick={() => setAccountOpen((o) => !o)}
                >
                  <span className="nav__account-avatar" aria-hidden="true">
                    {(user?.name ?? session?.name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="nav__account-name">{(user?.name ?? session?.name ?? '').split(' ')[0]}</span>
                  <ChevronDown size={13} className={`nav__account-chevron ${accountOpen ? 'nav__account-chevron--open' : ''}`} aria-hidden="true" />
                </button>
                {accountOpen && (
                  <div className="nav__account-menu" role="menu" aria-label="Account menu">
                    <div className="nav__account-head">
                      <strong>{user?.name ?? session?.name}</strong>
                      <span>
                        {view === 'admin' ? 'Admin' : view === 'restaurant_owner' ? 'Restaurant partner' : 'Food explorer'}
                      </span>
                    </div>
                    {accountItems.map((item) => (
                      <NavLink
                        key={item.label}
                        to={item.to}
                        role="menuitem"
                        className={({ isActive }) => `nav__account-link ${isActive ? 'nav__account-link--active' : ''}`}
                        onClick={() => setAccountOpen(false)}
                      >
                        <item.icon size={15} aria-hidden="true" /> {item.label}
                      </NavLink>
                    ))}
                    <div className="nav__account-divider" role="separator" />
                    <button type="button" className="nav__account-link nav__account-link--danger" role="menuitem" onClick={handleLogout}>
                      <LogOut size={15} aria-hidden="true" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `nav__link nav__link--profile ${isActive ? 'nav__link--active' : ''}`}>
                <UserCircle2 size={15} aria-hidden="true" /> Sign in
              </NavLink>
            )}
          </nav>

          <button
            type="button"
            className="nav__burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          <div
            className="nav__drawer-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="nav__mobile" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="nav__mobile-head">
              <span className="nav__mobile-title">Menu</span>
              <button
                type="button"
                className="nav__mobile-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <SearchBar
              variant="nav"
              formClassName="nav__search-mobile"
              restaurants={restaurantData ?? []}
              placeholder="Search restaurants…"
              onNavigate={() => setMenuOpen(false)}
            />
            <div className="nav__mobile-section">
              <span>Discover</span>
              <NavLink to="/discover" onClick={() => setMenuOpen(false)}><Compass size={15} aria-hidden="true" /> Discover</NavLink>
              <NavLink to="/explore" onClick={() => setMenuOpen(false)}><UtensilsCrossed size={15} aria-hidden="true" /> Search restaurants</NavLink>
              <NavLink to="/guides" onClick={() => setMenuOpen(false)}><BookOpen size={15} aria-hidden="true" /> Guides</NavLink>
              <NavLink to="/discover" onClick={() => setMenuOpen(false)}><UtensilsCrossed size={15} aria-hidden="true" /> Cuisines &amp; areas</NavLink>
              <NavLink to="/saved" onClick={() => setMenuOpen(false)}>
                <Bookmark size={15} aria-hidden="true" />
                Saved {savedIds.length > 0 && `(${savedIds.length})`}
              </NavLink>
              <NavLink to="/favorites" onClick={() => setMenuOpen(false)}>
                <Heart size={15} aria-hidden="true" />
                Favourites {favoriteIds.length > 0 && `(${favoriteIds.length})`}
              </NavLink>
            </div>
            <div className="nav__mobile-section">
              <span>Personal</span>
              {signedIn ? (
                <>
                  <NavLink to="/profile" onClick={() => setMenuOpen(false)}><UserCircle2 size={15} aria-hidden="true" /> Profile</NavLink>
                  {view === 'restaurant_owner' && <NavLink to="/manage" onClick={() => setMenuOpen(false)}><Store size={15} aria-hidden="true" /> Manage restaurant</NavLink>}
                  {view === 'admin' && <NavLink to="/admin" onClick={() => setMenuOpen(false)}><ShieldCheck size={15} aria-hidden="true" /> Admin</NavLink>}
                  <button type="button" className="nav__mobile-signout" onClick={handleLogout}>
                    <LogOut size={15} aria-hidden="true" /> Sign out
                  </button>
                </>
              ) : (
                <NavLink to="/login" onClick={() => setMenuOpen(false)}><UserCircle2 size={15} aria-hidden="true" /> Sign in</NavLink>
              )}
            </div>
            {view !== 'restaurant_owner' && (
              <div className="nav__mobile-section">
                <span>Restaurant partners</span>
                <NavLink to="/partners" onClick={() => setMenuOpen(false)}><Store size={15} aria-hidden="true" /> Partner with Khabo Kothay</NavLink>
                <NavLink to="/partners/list-your-restaurant" onClick={() => setMenuOpen(false)}><Store size={15} aria-hidden="true" /> List your restaurant</NavLink>
                <NavLink to="/partners/update-information" onClick={() => setMenuOpen(false)}><PenLine size={15} aria-hidden="true" /> Update information</NavLink>
                <NavLink to="/partners/how-listings-work" onClick={() => setMenuOpen(false)}><Info size={15} aria-hidden="true" /> How listings work</NavLink>
              </div>
            )}
            {view === 'restaurant_owner' && (
              <div className="nav__mobile-section">
                <span>Restaurant partners</span>
                <NavLink to="/manage?tab=profile" onClick={() => setMenuOpen(false)}><PenLine size={15} aria-hidden="true" /> Update information</NavLink>
                <NavLink to="/partners/how-listings-work" onClick={() => setMenuOpen(false)}><Info size={15} aria-hidden="true" /> How listings work</NavLink>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
