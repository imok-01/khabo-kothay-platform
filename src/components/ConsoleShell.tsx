import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, ArrowLeft } from 'lucide-react';

/**
 * ConsoleShell — the one signed-in chrome, shared by the KK admin console and
 * the restaurant owner console.
 *
 * Two consoles previously had two different navigations (a sidebar of routes on
 * one, a horizontal tab strip on the other) and neither matched the public
 * product's language. This is a single shell so an owner and a KK reviewer are
 * looking at the same object, and so the drawer/scrim/escape behaviour is
 * written once instead of twice.
 *
 * Nav items work in either mode. `to` renders a NavLink and the router owns the
 * active state; `onSelect` + `active` renders a button, which is what the
 * restaurant console needs because its sections are query-param tabs
 * (`/manage?tab=menu`) that other pages already deep-link to.
 *
 * Styling lives in console.css sections 1–2. The rail is permanent at ≥1025 and
 * becomes an overlay drawer below that.
 */

export interface ConsoleNavItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Route mode. */
  to?: string;
  end?: boolean;
  /** Button mode — used for query-param sections. */
  onSelect?: () => void;
  active?: boolean;
  /**
   * A real count only. Never render a placeholder here — an empty queue shows
   * no badge rather than a zero.
   */
  badge?: number;
  /** Draw the badge in the emphasis token because a human is being waited on. */
  attention?: boolean;
}

export interface ConsoleNavGroup {
  /**
   * Optional. A heading earns its place by telling you what the items below it
   * have in common — which a heading over a single item cannot do. Both consoles
   * opened with one ("Restaurant" over "Overview", "Operations" over "Overview"),
   * and a label that only ever names one thing reads as filler.
   */
  label?: string;
  /** Required when `label` is absent, since the key can no longer come from it. */
  key?: string;
  items: ConsoleNavItem[];
}

interface ConsoleShellProps {
  brand: { title: string; subtitle: string; icon: ReactNode; to?: string };
  groups: ConsoleNavGroup[];
  /** Shown in the mobile top bar so the current section is never ambiguous. */
  currentLabel: string;
  identity?: { name: string; role: string };
  /**
   * The console's one way out, and the only control in the rail foot.
   *
   * This slot used to hold Sign out, with the way back to the product as a
   * 12px `--ink-faint` link above it. So the loudest control in both consoles
   * was the one nobody wants — ending your session — while leaving the console
   * to go on using Khabo Kothay was the quietest thing on the screen. Signing
   * out lives in the public navbar's account menu and on the profile page,
   * which is where someone actually looks for it; it does not need a third
   * home, and it certainly does not need to be a console's main CTA.
   */
  backTo?: { to: string; label: string };
  children: ReactNode;
}

export default function ConsoleShell({
  brand, groups, currentLabel, identity, backTo, children,
}: ConsoleShellProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes — otherwise following a link
  // leaves the overlay covering the page you just navigated to.
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const initials = (identity?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'KK';

  return (
    <div className={`admin-shell ${open ? 'admin-shell--open' : ''}`}>
      <button
        type="button"
        className="admin-shell__scrim"
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      <aside className="admin-shell__side" aria-hidden={undefined}>
        <button type="button" className="admin-shell__close" onClick={() => setOpen(false)} aria-label="Close navigation">
          <X size={16} aria-hidden="true" />
        </button>

        <Link to={brand.to ?? '/'} className="admin-shell__brand">
          <span className="admin-shell__logo" aria-hidden="true">{brand.icon}</span>
          <span className="admin-shell__brand-text">
            <strong>{brand.title}</strong>
            <span>{brand.subtitle}</span>
          </span>
        </Link>

        <nav className="admin-shell__nav" aria-label={`${brand.title} sections`}>
          {/* Each group is a real box. It used to be `display: contents`, which
              made every group heading the first child of its own wrapper — so
              `.admin-shell__nav-group:first-child { padding-top: 0 }` matched all
              four of them and the space that was meant to separate one group
              from the next was removed everywhere. A group that is a box can be
              spaced as a box, and the CSS says what it means. */}
          {groups.map((group) => (
            <div key={group.key ?? group.label} className="admin-shell__nav-section">
              {group.label && <span className="admin-shell__nav-group">{group.label}</span>}
              {group.items.map((item) => {
                const inner = (
                  <>
                    {item.icon}
                    <span className="admin-shell__link-text">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`admin-shell__link-badge ${item.attention ? 'admin-shell__link-badge--attention' : ''}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                );
                return item.to ? (
                  <NavLink
                    key={item.key}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `admin-shell__link ${isActive ? 'admin-shell__link--active' : ''}`}
                  >
                    {inner}
                  </NavLink>
                ) : (
                  <button
                    key={item.key}
                    type="button"
                    className={`admin-shell__link ${item.active ? 'admin-shell__link--active' : ''}`}
                    aria-current={item.active ? 'page' : undefined}
                    onClick={() => { item.onSelect?.(); setOpen(false); }}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-shell__foot">
          {identity && (
            <div className="admin-shell__identity">
              <span className="admin-shell__avatar" aria-hidden="true">{initials}</span>
              <span className="admin-shell__identity-text">
                <strong>{identity.name}</strong>
                <span>{identity.role}</span>
              </span>
            </div>
          )}
          {backTo && (
            <Link to={backTo.to} className="admin-shell__exit">
              <ArrowLeft size={16} aria-hidden="true" />
              {backTo.label}
            </Link>
          )}
        </div>
      </aside>

      <div className="admin-shell__content">
        <div className="admin-shell__topbar">
          <button
            type="button"
            className="admin-shell__menu-btn"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
          >
            <MenuIcon size={18} aria-hidden="true" />
          </button>
          <span className="admin-shell__topbar-title">{currentLabel}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
