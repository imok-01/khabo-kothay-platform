import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Store, ClipboardCheck, Flag, MessageSquareQuote, Database,
  Settings as SettingsIcon, LogOut, Soup, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Admin layout — a separate shell from the public website navigation so admin
 * tools never mix with the customer/consumer header. Sidebar mirrors the
 * product's admin surface: the Dashboard is the live tool today; the other
 * sections are routed placeholders that will be wired during the database
 * integration (no fake data or tools are shown).
 */
const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/restaurants', label: 'Restaurants', icon: Store, end: false },
  { to: '/admin/verification', label: 'Verification queue', icon: ClipboardCheck, end: false },
  { to: '/admin/reports', label: 'User reports', icon: Flag, end: false },
  { to: '/admin/reviews', label: 'Reviews', icon: MessageSquareQuote, end: false },
  { to: '/admin/data', label: 'Data management', icon: Database, end: false },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon, end: false },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-shell__side">
        <div className="admin-shell__brand">
          <span className="admin-shell__logo" aria-hidden="true"><Soup size={18} /></span>
          <span className="admin-shell__brand-text">
            <strong>KK Admin</strong>
            <small>Khabo Kothay BD</small>
          </span>
        </div>
        <nav className="admin-shell__nav" aria-label="Admin sections">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-shell__link ${isActive ? 'admin-shell__link--active' : ''}`}
            >
              <item.icon size={16} aria-hidden="true" /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-shell__foot">
          <button type="button" className="admin-shell__logout" onClick={handleLogout}>
            <LogOut size={16} aria-hidden="true" /> Logout
          </button>
        </div>
      </aside>
      <div className="admin-shell__content">
        <Outlet />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Placeholder sections — routed preparation pages for admin modules   */
/* that arrive with the backend. Honest copy, no fake tools.           */
/* ------------------------------------------------------------------ */

const ADMIN_PLACEHOLDERS: Record<
  string,
  { eyebrow: string; title: string; description: string; bullets: string[] }
> = {
  restaurants: {
    eyebrow: 'Admin · Restaurants',
    title: 'Restaurants',
    description:
      'A dedicated restaurant management module — full listing records, menu data, photos and ownership. Today the core restaurant tools live in the Dashboard’s Restaurants tab.',
    bullets: [
      'Full listing records with provenance and verification level',
      'Menu and photo management per restaurant',
      'Restaurant ownership mapping for partner accounts',
    ],
  },
  verification: {
    eyebrow: 'Admin · Verification',
    title: 'Verification queue',
    description:
      'Review queue for new listings, change requests and restaurant-provided updates before anything is published. Nothing goes live without review.',
    bullets: [
      'Restaurant listing drafts awaiting approval',
      'Change requests from restaurant partners',
      'Source labelling and verification level per field',
    ],
  },
  reports: {
    eyebrow: 'Admin · User reports',
    title: 'User reports',
    description:
      'Community-flagged listings — incorrect hours, moved locations, outdated menus — triaged and actioned.',
    bullets: [
      'Flags raised through “Feedback on a listing”',
      'Deduplicated and routed to the right owner',
      'Resolution notes recorded for transparency',
    ],
  },
  reviews: {
    eyebrow: 'Admin · Reviews',
    title: 'Reviews',
    description:
      'Moderation and curation of community reviews. The current review tools live in the Dashboard’s Reviews tab.',
    bullets: [
      'Moderation queue for new community reviews',
      'Reported-review handling',
      'Review source labelling (in-app vs Google)',
    ],
  },
  data: {
    eyebrow: 'Admin · Data management',
    title: 'Data management',
    description:
      'Data refresh, import and export tooling — Google data refreshes, menu dataset imports and bulk corrections as the database integration lands.',
    bullets: [
      'Google data refresh scheduling and status',
      'Menu dataset import review',
      'Bulk corrections and data-quality reports',
    ],
  },
  settings: {
    eyebrow: 'Admin · Settings',
    title: 'Settings',
    description:
      'Platform configuration — market details, feature flags, verification rules and admin account management. Admin accounts are created manually, never by public signup.',
    bullets: [
      'Market and brand configuration',
      'Verification and moderation rules',
      'Manual admin account management',
    ],
  },
};

export function AdminPlaceholderSection({ section }: { section: string }) {
  const data = ADMIN_PLACEHOLDERS[section];
  if (!data) return null;
  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <span className="section-heading__eyebrow">{data.eyebrow}</span>
        <h1 style={{ marginTop: 'var(--s1)' }}>{data.title}</h1>
        <div className="info-body" style={{ marginTop: 'var(--s5)' }}>
          <section className="info-card">
            <p>{data.description}</p>
            <ul className="info-list" style={{ margin: 'var(--s3) 0' }}>
              {data.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p style={{ marginBottom: 'var(--s4)' }}>
              This module will be connected as part of the Khabo Kothay database integration. The
              current Dashboard already covers the core day-to-day admin tools.
            </p>
            <Link to="/admin" className="btn btn--ghost">
              <ArrowLeft size={15} aria-hidden="true" /> Return to dashboard
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
