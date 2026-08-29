import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Soup, Bookmark, Menu, X, UserCircle2, ShieldCheck, Store, Info, Compass, BookOpen, PenLine, LogOut, Settings, LayoutDashboard, ChevronDown, Heart, Home, SlidersHorizontal, Library } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { animated, useSpring } from '@react-spring/web';
import { useSaved } from '../context/SavedContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { roleViewOf, type RoleView } from '../domain/auth';
import { useOwnerRestaurant } from '../hooks/useOwnerRestaurant';
import { useRestaurants } from '../hooks/useRestaurants';
import { useMediaQuery } from '../hooks/useMediaQuery';
import SearchBar from './SearchBar';
import { Dialog } from './ui';

/** Matches `.nav__link-label`'s resting `margin-left` — the icon's gap. */
const LABEL_GAP = 8;
/**
 * The two numbers below are not a taste judgement. They are set by a
 * collision.
 *
 * The field is centred, so it opens *into* the destinations, and the room it
 * needs is the room the labels are giving up. Both are springs, so "the
 * labels go first" is not something the source order guarantees — it has to
 * be true of the two curves. At the narrowest viewport that still keeps
 * destinations in the bar (1140px: 1053px of content, the group's left edge
 * at 943, the field's centre at 562.5) the margin is about 38px at rest,
 * which a 260/30 label spring plus 45ms×3 of stagger does not clear in
 * time — modelled frame by frame, the growing field crossed the leftmost
 * label by 9px for roughly a tenth of a second near t=100ms.
 *
 * 340/32 with a 26ms step settles the labels in ~257ms with the last one
 * done by ~309ms, comfortably inside the field's 393ms, and turns that −9px
 * into +11px of clearance at the tightest frame. Above 1200px there was
 * never a problem (81px), so this is the narrow band paying for itself.
 *
 * The stagger's *direction* is free: the group's left edge depends on the
 * sum of the label widths, and that sum follows the same schedule whether
 * the delays run 0/26/52 or 52/26/0. Only the total span and the spring's
 * stiffness buy clearance — so the order below is chosen for how it reads.
 */
const LABEL_STEP = 26;
const LABEL_SPRING = { tension: 340, friction: 32, clamp: true };

/**
 * Mirrors REST_W in SearchBar.tsx. The band the destinations have to keep out
 * of is the *resting* pill, not the 144px hover width: the 8px hover adds to
 * each side is a transient, and the row's own gap is there to absorb exactly
 * that much.
 */
const FIELD_REST_W = 128;
/** Clearance demanded on top of the row gap before a rung counts as a fit. */
const FIELD_CLEAR = 8;

/**
 * How much of itself the bar can afford to show.
 *
 * The field is centred on the *row*, not between the flanks, and the flanks are
 * nowhere near equal: the brand is 163px and the right cluster — destinations,
 * account control, menu — is up to 582. So the room the field reserves is
 * `container/2 − 64` per side whatever is in the row, and the right cluster
 * either fits inside that or it does not. Measured at 1200px of container,
 * which is the widest the header ever gets:
 *
 *   guest        3 labels + a 90px Sign in        426  → fits, 92px spare
 *   admin        4 labels + a named account pill  566  → 48px over
 *   customer     4 labels (one with a tally)      582  → 64px over
 *
 * That is the whole of the reported collision, and it is not a narrow band:
 * `--container` caps at 1200, so no desktop width is wide enough to hold the
 * signed-in composition at full width. Something in the row has to yield, so
 * the row is measured and the *least* valuable words yield first, in this
 * order:
 *
 *   1  the account name folds into its avatar — the name is already printed at
 *      the head of the menu the trigger opens, so it is the one thing up there
 *      that is genuinely said twice
 *   2  destination labels fold to their icons from the far end inwards, one at
 *      a time, and the route you are *on* is exempt until last: the bar goes
 *      on saying where you are long after it has stopped naming where you
 *      could go. Folding from the right is also the direction the search
 *      interaction already unfolds them in, so the two read as one vocabulary
 *   3  the active label folds too — the same all-icons row an open search
 *      field produces
 *
 * `keep` counts how many labels from the left keep their word; `here` exempts
 * the active one; `name` is the account name. One label at a time rather than
 * four rungs, because a discrete ladder puts a cliff in the middle of a smooth
 * resize — at 1153px of container the row is 2.5px short, and paying for 2.5px
 * by folding three words at once is exactly the "accidental" the brief rules
 * out.
 *
 * Nothing is removed at any point: every destination stays in the bar, stays
 * clickable, keeps its accessible name and keeps the gold underline (which
 * shortens to the width of the icon rather than switching off). The fit is
 * measured, not keyed to a breakpoint, so it is right for any name length, any
 * font, any future destination and any width.
 */
type BarFit = {
  /** how many labels, counting from the left, keep their word */
  keep: number;
  /** whether the active route's label is exempt from folding */
  here: boolean;
  /** whether the account name keeps its word */
  name: boolean;
};

/**
 * A destination label that steps out of the field's way instead of being
 * switched off.
 *
 * The header used to answer an open search by fading the whole link group to
 * `opacity: 0`. It freed the room and it read as exactly what it was —
 * elements being hidden because something else needed the space. What happens
 * now is that each link *abbreviates*: the label collapses into its own icon,
 * left to right, and the icon stays. Home, Discover and Explore are still in
 * the bar while you search, still clickable, still showing which one you are
 * on (the gold underline shortens with the box). Nothing is removed, so
 * nothing has to come back.
 *
 * It also happens to cost nothing in layout. `.nav__links` is pushed right by
 * an auto margin, so a child that narrows moves its own left edge and leaves
 * every sibling to its right exactly where it was — the Sign in button and the
 * menu button do not shift by a pixel through the whole interaction.
 *
 * The width has to be a number for the spring to interpolate it, and the only
 * honest source for that number is the label itself. `scrollWidth` is read on
 * mount and again after `document.fonts.ready`, and it is the *content* width
 * even while `overflow: hidden` is clipping the box — so it stays the natural
 * width no matter what the spring is doing to the visible one.
 */
function NavLabel({
  children,
  compact,
  delay,
  immediate,
  className = 'nav__link-label',
}: {
  children: string;
  compact: boolean;
  delay: number;
  immediate: boolean;
  /** the folding box's own class — the account name folds the same way */
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [full, setFull] = useState<number | null>(null);
  /* Starting at the *current* target rather than always at 1 is what keeps a
     bar that mounts already-folded from painting its labels open for a frame
     and then closing them. */
  const [style, api] = useSpring(() => ({ t: compact ? 0 : 1, config: LABEL_SPRING }));

  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (alive && ref.current) setFull(ref.current.scrollWidth + 1);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      alive = false;
    };
  }, [children]);

  useEffect(() => {
    api.start({ t: compact ? 0 : 1, delay: immediate ? 0 : delay, immediate });
  }, [compact, delay, immediate, api]);

  return (
    <animated.span
      ref={ref}
      className={className}
      style={
        full === null
          ? /* Pre-measurement. Collapsed if that is where this label belongs,
               so the first paint is already right; `scrollWidth` reads the
               natural width straight through a zero-width clip. */
            compact
            ? { width: 0, marginLeft: 0, opacity: 0 }
            : undefined
          : {
              width: style.t.to((v) => v * full),
              marginLeft: style.t.to((v) => v * LABEL_GAP),
              /* Ahead of the width, so the letters are gone before the box
                 that holds them is — a label fading in step with its own
                 clip reads as a shutter closing on it. */
              opacity: style.t.to((v) => Math.min(1, v * 1.7)),
            }
      }
    >
      {children}
    </animated.span>
  );
}

/** One bar destination. */
interface Destination {
  to: string;
  label: string;
  icon: LucideIcon;
  /** exact-match only, for `/` */
  end?: boolean;
  /** the Collection tally */
  count?: number;
  /** admin, which is marked rather than merely listed */
  role?: boolean;
}

/**
 * Role-aware primary navigation.
 *
 *   guest            → Home · Discover · Explore · Sign in
 *   customer         → Home · Discover · Explore · Collection · account menu
 *   restaurant_owner → Dashboard · My restaurant · account menu
 *   admin            → Home · Discover · Explore · Admin · account menu
 *
 * Phase C settled the four consumer destinations and what each one is *for*:
 *
 *   Home        the emotional front door
 *   Discover    deliberate exploration — the whole taxonomy, browsable
 *   Explore     the filter surface — facets, sorting, map, results
 *   Collection  everything you kept: Saved (broad) + Favourites (curated)
 *
 * Saved and Favourites are no longer two sibling top-level links racing each
 * other; they are two tabs inside one Collection, which is what the pair
 * actually is. The drawer's duplicate Discover entry ("Discover" and
 * "Cuisines & areas" both pointed at `/discover`) is gone, and the drawer now
 * mirrors the same four destinations rather than inventing its own set.
 *
 * The hamburger (right, every width) opens the same grouped drawer for all
 * roles; account actions (settings, sign out) live only inside the account
 * menu — never permanently in the bar.
 */
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  /**
   * The bar's own copy of the search field's state. `SearchBar` owns it —
   * focus, the query and the suggestion list are all its business — and
   * reports it up, because the *composition* is the header's business: the
   * destinations abbreviate and the glass densifies, and neither of those is
   * something a form field can reach.
   *
   * `setSearchOpen` is passed straight through as the callback so the prop is
   * referentially stable and the effect behind it fires on the state, not on
   * every render.
   */
  const [searchOpen, setSearchOpen] = useState(false);
  /**
   * How much of itself the row is showing, and whether it got there without
   * being watched. `snap` is true only for the first measurement after mount:
   * a bar that loads already-dense should *be* dense, not perform a fold on
   * arrival. Every change after that animates, which is the whole point.
   *
   * `keep: Infinity` is the optimistic start — every word shown — so a row
   * that has room never flickers through a folded frame on its way to resting.
   */
  const [bar, setBar] = useState<{ fit: BarFit; snap: boolean }>({
    fit: { keep: Infinity, here: true, name: true },
    snap: true,
  });
  const innerRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { savedIds } = useSaved();
  const { favoriteIds } = useFavorites();
  const { session, user, logout } = useAuth();
  const { data: restaurantData } = useRestaurants();
  /* The label collapse is JS, so editorial.css §19's blanket — which only
     zeroes CSS durations — cannot reach it. Every spring start is told. */
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');

  const view: RoleView = roleViewOf(session?.role);
  const signedIn = Boolean(session);
  const firstOwnedRestaurant = useOwnerRestaurant(session?.restaurantIds);
  const ownerRestaurantPath = firstOwnedRestaurant ? `/restaurant/${firstOwnedRestaurant.id}` : '/manage';

  // One Collection, one number: the union, because a restaurant can be both
  // saved and favourited and adding the two counts would overstate it.
  const collectionCount = new Set([...savedIds, ...favoriteIds]).size;

  // The bar gains a shadow and a more opaque ground once the page moves, so
  // it reads as chrome over content rather than part of the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The drawer's Escape listener and body-scroll lock used to live here. Both
  // are `Dialog`'s now (primitives.css §8) — and the lock had to go rather than
  // stay as a harmless duplicate, because Radix's `RemoveScroll` sets
  // `overflow: hidden` on open, which this effect would then have recorded as
  // the value to restore.

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

  const linkClass = ({ isActive }: { isActive: boolean }) => `nav__link ${isActive ? 'nav__link--on' : ''}`;

  /**
   * Routes that open on an ink band, where the bar floats over the page opening
   * instead of sitting on top of it as a separate strip.
   *
   * The homepage hero and `/discover`'s console header are both pulled up
   * underneath this fixed bar (see `.app__body:has(.hero-c)` and
   * `:has(.dsc-head)` in polish.css). On those two routes the bar has no chrome
   * at all at rest — it is lettering on the band — and materialises into glass
   * once the page moves. Every other route starts on warm paper, where a
   * transparent bar would put light text on light ground.
   */
  const overInk = location.pathname === '/' || location.pathname === '/discover';

  /**
   * The account button has to say *something*. `user` loads a beat after
   * `session`, and a session without a name at all is possible, so both were
   * able to render an empty span next to a "?" avatar.
   */
  const accountName = user?.name ?? session?.name ?? '';
  const accountLabel = accountName.split(' ')[0] || 'Account';
  const accountInitial = (accountName.trim()[0] ?? 'K').toUpperCase();

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
    // customer. `/profile` appeared twice here — as "Profile" and again as
    // "Settings" — which made the menu look longer than it was.
    return [
      { to: '/profile', label: 'Profile & preferences', icon: UserCircle2 },
      { to: '/saved', label: 'Your collection', icon: Library },
      { to: '/favorites', label: 'Favourites', icon: Heart },
    ];
  })();

  /**
   * The bar's destinations, as data rather than as markup.
   *
   * They were three inline `<NavLink>`s plus two conditional ones, which was
   * readable right up until each of them needed to know *where in the row it
   * sits* — the labels leave leftmost-first, one after another, and an index
   * is the only way to say that. Same links, same order, same conditions.
   */
  const destinations: Destination[] =
    view === 'restaurant_owner'
      ? [
          { to: '/manage', label: 'Dashboard', icon: LayoutDashboard },
          { to: ownerRestaurantPath, label: 'My restaurant', icon: Store },
        ]
      : [
          { to: '/', label: 'Home', icon: Home, end: true },
          { to: '/discover', label: 'Discover', icon: Compass },
          { to: '/explore', label: 'Explore', icon: SlidersHorizontal },
          // Collection for signed-in customers, and for anyone who has already
          // kept something — a guest's local list must not vanish behind a
          // sign-in wall.
          ...(view === 'customer' || (view === 'guest' && collectionCount > 0)
            ? [{ to: '/saved', label: 'Collection', icon: Library, count: collectionCount }]
            : []),
          ...(view === 'admin' ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck, role: true }] : []),
        ];

  /**
   * Measure the row and pick a fit. See `BarFit`.
   *
   * Every quantity here is reconstructed from `scrollWidth`, which reports the
   * natural content width of a label even while `overflow: hidden` is clipping
   * it to nothing (verified: a folded label reads `width: 0, scrollWidth: 57`).
   * That is what makes the decision a *fixed point*: whatever the springs are
   * doing at the moment of measurement — folded, unfolded, mid-flight, folded
   * because the search field is open — `bare` and `budget` come out the same.
   * So applying a fit cannot change the fit, and the observer below cannot
   * oscillate.
   *
   * The group's right edge is what is pinned (`.nav__links { margin-left:
   * auto }`), so widening anything to its right moves its *left* edge left.
   * Hence one measured origin — `bare`, the left edge the group would have with
   * every word folded away — and one subtraction per word spent out of
   * `budget`.
   *
   * Deps are empty on purpose. Nothing in here reads React state; the
   * ResizeObserver watches the two groups whose width the composition changes,
   * so signing in, a role change, a new tally, a route change and a window
   * resize all arrive through the same door.
   */
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    let first = true;
    const foldable = (el: Element | null) => {
      if (!el) return { natural: 0, now: 0 };
      const h = el as HTMLElement;
      return {
        natural: h.scrollWidth + 1 + LABEL_GAP,
        now: h.getBoundingClientRect().width + (parseFloat(getComputedStyle(h).marginLeft) || 0),
      };
    };
    const measure = () => {
      const box = inner.getBoundingClientRect();
      const links = inner.querySelector('.nav__links');
      const linksBox = links?.getBoundingClientRect();
      /* Below 1140px the destinations are in the drawer (phase-c.css) and
         there is nothing in the row that can reach the field. */
      let next: BarFit = { keep: Infinity, here: true, name: true };
      if (box.width > 0 && linksBox && linksBox.width > 0) {
        const rowGap = parseFloat(getComputedStyle(inner).columnGap) || 10;
        const clear = box.width / 2 + FIELD_REST_W / 2 + rowGap + FIELD_CLEAR;
        const els = Array.from(inner.querySelectorAll<HTMLElement>('.nav__links .nav__link-label'));
        const labels = els.map(foldable);
        const name = foldable(inner.querySelector('.nav__account-name'));
        /* −1 when the route is not one of the destinations, in which case the
           `here` exemption simply has nothing to exempt. */
        const active = els.indexOf(inner.querySelector('.nav__link--on .nav__link-label') as HTMLElement);
        const bare =
          linksBox.left - box.left + labels.reduce((n, l) => n + l.now, 0) + name.now;
        const budget = bare - clear;
        const cost = (fit: BarFit) =>
          labels.reduce(
            (n, l, i) => n + (i < fit.keep || (fit.here && i === active) ? l.natural : 0),
            0,
          ) + (fit.name ? name.natural : 0);
        /* Most words first, fewest last, cost monotonically non-increasing —
           so the first entry that fits is the best one that fits. */
        const order: BarFit[] = [{ keep: labels.length, here: true, name: true }];
        for (let k = labels.length; k >= 0; k--) order.push({ keep: k, here: true, name: false });
        order.push({ keep: 0, here: false, name: false });
        next = order.find((fit) => cost(fit) <= budget) ?? order[order.length - 1];
      }
      setBar((p) =>
        p.fit.keep === next.keep && p.fit.here === next.here && p.fit.name === next.name
          ? p
          : { fit: next, snap: p.snap },
      );
      if (first) {
        first = false;
        /* One macrotask is long enough for the fit above to have been applied
           and short enough that no user gesture can precede it. */
        setTimeout(() => setBar((p) => (p.snap ? { fit: p.fit, snap: false } : p)), 0);
      }
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    ro.observe(inner);
    const links = inner.querySelector('.nav__links');
    const actions = inner.querySelector('.nav__actions');
    if (links) ro.observe(links);
    if (actions) ro.observe(actions);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <header
        className={`nav ${scrolled ? 'nav--scrolled' : ''} ${overInk && !scrolled ? 'nav--over-hero' : ''} ${searchOpen ? 'nav--searching' : ''}`}
      >
        <div className="nav__inner" ref={innerRef}>
          <Link to="/" className="nav__brand" onClick={() => {
            setMenuOpen(false);
            // Clicking the brand while already on the homepage should scroll to
            // the top — the router only scrolls when the pathname changes.
            if (location.pathname === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <span className="nav__logo" aria-hidden="true"><Soup size={20} /></span>
            <span className="nav__wordmark">
              <span className="nav__brand-mark">Khabo <em>Kothay</em></span>
              <span className="nav__brand-sub">Dhaka · where to eat</span>
            </span>
          </Link>

          <SearchBar variant="nav" restaurants={restaurantData ?? []} onOpenChange={setSearchOpen} />

          <nav className="nav__links" aria-label="Main navigation">
            {destinations.map((d, i) => (
              <NavLink
                key={d.label}
                to={d.to}
                end={d.end}
                className={
                  d.role
                    ? ({ isActive }) => `nav__link nav__link--role ${isActive ? 'nav__link--on' : ''}`
                    : linkClass
                }
              >
                {({ isActive }) => (
                  <>
                    <d.icon size={16} aria-hidden="true" />
                    {/* Leaving, the labels go leftmost-first: the one the
                        growing field reaches first is the one that yields
                        first. Coming back, the trail reverses — the outermost
                        returns first and the one next to the field arrives
                        last, once the field has actually vacated the room it
                        needs. The same stagger carries a change of fit, which is
                        why a dense bar reads as settling rather than as
                        elements going out.

                        `isActive` is why this is a render prop: the route you
                        are on is exempt from folding until every other label
                        has already gone, and only the link itself knows that it
                        is the one. */}
                    <NavLabel
                      compact={
                        searchOpen ||
                        !(i < bar.fit.keep || (bar.fit.here && isActive))
                      }
                      delay={(searchOpen ? i : destinations.length - 1 - i) * LABEL_STEP}
                      immediate={reduce || bar.snap}
                    >
                      {d.label}
                    </NavLabel>
                    {d.count ? <span className="nav__count">{d.count}</span> : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Account or Sign in — a cluster of its own, not the tail of the
              destination list. They were siblings of Home/Discover/Explore,
              which put an action inside `<nav aria-label="Main navigation">`
              and made the group's spacing serve two different jobs. Split, the
              destinations can carry a tight 2px rhythm while the actions keep
              their own breathing room, and the labels can collapse without the
              CTA being dragged into the same motion. */}
          <div className="nav__actions">
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
                    {accountInitial}
                  </span>
                  {/* Folds exactly like a destination label, and it is the
                      first thing in the row asked to: the name is printed
                      again at the head of the menu this button opens, so it
                      is the only thing up there that is genuinely said twice.
                      `aria-label` above carries the accessible name either
                      way, and the avatar keeps the initial. */}
                  <NavLabel
                    className="nav__account-name"
                    compact={!bar.fit.name}
                    delay={0}
                    immediate={reduce || bar.snap}
                  >
                    {accountLabel}
                  </NavLabel>
                  <ChevronDown size={14} className={`nav__account-chevron ${accountOpen ? 'nav__account-chevron--open' : ''}`} aria-hidden="true" />
                </button>
                {accountOpen && (
                  <div className="nav__account-menu" role="menu" aria-label="Account menu">
                    <div className="nav__account-head">
                      <strong>{accountName || 'Your account'}</strong>
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
                        <item.icon size={16} aria-hidden="true" /> {item.label}
                      </NavLink>
                    ))}
                    <div className="nav__account-divider" role="separator" />
                    <button type="button" className="nav__account-link nav__account-link--danger" role="menuitem" onClick={handleLogout}>
                      <LogOut size={16} aria-hidden="true" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="nav__cta">
                <UserCircle2 size={16} aria-hidden="true" /> Sign in
              </Link>
            )}
          </div>

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

      {/* `bare`: the drawer keeps every pixel of its own presentation — the
          backdrop and the sheet are still `.nav__drawer-backdrop` and
          `.nav__mobile` at z 70/71 — and takes only the behaviour it never
          had: a focus trap, Escape, one scroll lock, and focus returned to
          the hamburger on close.

          `open={menuOpen}` rather than `{menuOpen && <Dialog open …>}`: a
          conditional mount tears the sheet out of the tree in the same commit
          as the click, so there was no closing animation to run and the drawer
          vanished. Radix keeps it mounted until its `[data-state='closed']`
          animation ends (polish.css §11), and renders nothing at all while
          closed — so the sheet's contents, including this SearchBar, still
          cost nothing until it opens. */}
      <Dialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        variant="bare"
        title="Menu"
        overlayClassName="nav__drawer-backdrop"
        className="nav__mobile"
      >
        {/* Grab handle. Only visible in the mobile bottom-sheet presentation,
            where it is the affordance that says "this sheet came up from the
            bottom edge" — CSS hides it in the desktop side drawer. */}
        <span className="nav__mobile-grip" aria-hidden="true" />
        <div className="nav__mobile-head">
          <span className="nav__mobile-brand">
            <span className="nav__mobile-mark">Khabo <em>Kothay</em></span>
            <span className="nav__mobile-title">Menu</span>
          </span>
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
        {/* The drawer mirrors the bar's four destinations. It previously
            listed `/discover` twice — once as "Discover" and again as
            "Cuisines & areas" — and offered no route to the homepage. */}
        <div className="nav__mobile-section">
          <span>Where to eat</span>
          <NavLink to="/" end onClick={() => setMenuOpen(false)}><Home size={16} aria-hidden="true" /> Home</NavLink>
          <NavLink to="/discover" onClick={() => setMenuOpen(false)}><Compass size={16} aria-hidden="true" /> Discover — browse the city</NavLink>
          <NavLink to="/explore" onClick={() => setMenuOpen(false)}><SlidersHorizontal size={16} aria-hidden="true" /> Explore — filter &amp; search</NavLink>
          <NavLink to="/guides" onClick={() => setMenuOpen(false)}><BookOpen size={16} aria-hidden="true" /> Guides</NavLink>
        </div>
        <div className="nav__mobile-section">
          <span>Your collection</span>
          <NavLink to="/saved" onClick={() => setMenuOpen(false)}>
            <Bookmark size={16} aria-hidden="true" />
            Saved {savedIds.length > 0 && `(${savedIds.length})`}
          </NavLink>
          <NavLink to="/favorites" onClick={() => setMenuOpen(false)}>
            <Heart size={16} aria-hidden="true" />
            Favourites {favoriteIds.length > 0 && `(${favoriteIds.length})`}
          </NavLink>
        </div>
        <div className="nav__mobile-section">
          <span>Personal</span>
          {signedIn ? (
            <>
              <NavLink to="/profile" onClick={() => setMenuOpen(false)}><UserCircle2 size={16} aria-hidden="true" /> Profile</NavLink>
              {view === 'restaurant_owner' && <NavLink to="/manage" onClick={() => setMenuOpen(false)}><Store size={16} aria-hidden="true" /> Manage restaurant</NavLink>}
              {view === 'admin' && <NavLink to="/admin" onClick={() => setMenuOpen(false)}><ShieldCheck size={16} aria-hidden="true" /> Admin</NavLink>}
              <button type="button" className="nav__mobile-signout" onClick={handleLogout}>
                <LogOut size={16} aria-hidden="true" /> Sign out
              </button>
            </>
          ) : (
            <NavLink to="/login" onClick={() => setMenuOpen(false)}><UserCircle2 size={16} aria-hidden="true" /> Sign in</NavLink>
          )}
        </div>
        {view !== 'restaurant_owner' && (
          <div className="nav__mobile-section">
            <span>Restaurant partners</span>
            <NavLink to="/partners" onClick={() => setMenuOpen(false)}><Store size={16} aria-hidden="true" /> Partner with Khabo Kothay</NavLink>
            <NavLink to="/partners/list-your-restaurant" onClick={() => setMenuOpen(false)}><Store size={16} aria-hidden="true" /> List your restaurant</NavLink>
            <NavLink to="/partners/update-information" onClick={() => setMenuOpen(false)}><PenLine size={16} aria-hidden="true" /> Update information</NavLink>
            <NavLink to="/partners/how-listings-work" onClick={() => setMenuOpen(false)}><Info size={16} aria-hidden="true" /> How listings work</NavLink>
          </div>
        )}
        {view === 'restaurant_owner' && (
          <div className="nav__mobile-section">
            <span>Restaurant partners</span>
            <NavLink to="/partners/how-listings-work" onClick={() => setMenuOpen(false)}><Info size={16} aria-hidden="true" /> How listings work</NavLink>
          </div>
        )}
      </Dialog>
    </>
  );
}
