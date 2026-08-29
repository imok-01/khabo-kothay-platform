import { Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Store, ClipboardCheck, MessageSquareQuote, Sparkles,
  Settings as SettingsIcon, Soup, ArrowLeft, FileCheck, BadgePercent, LineChart, Users,
} from 'lucide-react';
import ConsoleShell, { type ConsoleNavGroup } from './ConsoleShell';
import { Button } from './ui';
import { useRestaurantDrafts, useSuggestions } from '../hooks/useDrafts';
import { useFlags } from '../hooks/useReviews';

/**
 * KK admin shell.
 *
 * Previously this sidebar listed seven destinations and six of them were prose
 * placeholders, while the nine working tools sat behind a tab strip on /admin
 * itself. The sidebar now points at those tools directly (see the route table in
 * App.tsx and SECTION_META in ExecutiveAdminPage.tsx), grouped by what the work
 * actually is: things waiting on a person, the catalogue itself, and people.
 *
 * The three original placeholder URLs are kept alive so nothing that links to
 * them 404s — /admin/verification is the menu review queue and /admin/data is
 * the enrichment queue. Settings is the one section with no tool behind it, so
 * it stays an honest placeholder.
 *
 * Badges are counted from the same stores the sections read. An empty queue
 * shows no badge rather than a zero.
 */

const SECTION_LABEL: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/applications': 'Restaurant applications',
  '/admin/verification': 'Menu submissions',
  '/admin/offers': 'Offers',
  '/admin/reviews': 'Reviews & flags',
  '/admin/data': 'Enrichment queue',
  '/admin/restaurants': 'Restaurants',
  '/admin/prices': 'Price history',
  '/admin/users': 'People',
  '/admin/settings': 'Settings',
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  const drafts = useRestaurantDrafts();
  const flags = useFlags();
  const suggestions = useSuggestions();

  const pendingDrafts = drafts.filter((d) => d.status === 'pending').length;
  const pendingFlags = flags.filter((f) => f.status === 'pending').length;
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending').length;

  const groups: ConsoleNavGroup[] = [
    // No heading: "Operations" named one item, and that item is Overview.
    {
      key: 'lead',
      items: [
        { key: 'overview', label: 'Overview', to: '/admin', end: true, icon: <LayoutDashboard size={16} aria-hidden="true" /> },
      ],
    },
    {
      label: 'Review queue',
      items: [
        { key: 'applications', label: 'Applications', to: '/admin/applications', icon: <FileCheck size={16} aria-hidden="true" /> },
        { key: 'menus', label: 'Menu submissions', to: '/admin/verification', icon: <ClipboardCheck size={16} aria-hidden="true" /> },
        { key: 'enrichment', label: 'Enrichment', to: '/admin/data', icon: <Sparkles size={16} aria-hidden="true" />, badge: pendingSuggestions, attention: true },
        { key: 'offers', label: 'Offers', to: '/admin/offers', icon: <BadgePercent size={16} aria-hidden="true" /> },
        { key: 'reviews', label: 'Reviews & flags', to: '/admin/reviews', icon: <MessageSquareQuote size={16} aria-hidden="true" />, badge: pendingFlags, attention: true },
      ],
    },
    {
      label: 'Catalogue',
      items: [
        { key: 'restaurants', label: 'Restaurants', to: '/admin/restaurants', icon: <Store size={16} aria-hidden="true" />, badge: pendingDrafts, attention: true },
        { key: 'prices', label: 'Price history', to: '/admin/prices', icon: <LineChart size={16} aria-hidden="true" /> },
      ],
    },
    {
      label: 'Platform',
      items: [
        { key: 'users', label: 'People', to: '/admin/users', icon: <Users size={16} aria-hidden="true" /> },
        { key: 'settings', label: 'Settings', to: '/admin/settings', icon: <SettingsIcon size={16} aria-hidden="true" /> },
      ],
    },
  ];

  return (
    <ConsoleShell
      brand={{ title: 'KK Admin', subtitle: 'Khabo Kothay', icon: <Soup size={18} />, to: '/admin' }}
      groups={groups}
      currentLabel={SECTION_LABEL[pathname] ?? 'KK Admin'}
      identity={{ name: 'Khabo Kothay team', role: 'Executive' }}
      backTo={{ to: '/', label: 'Back to Khabo Kothay' }}
    >
      <Outlet />
    </ConsoleShell>
  );
}

/* ------------------------------------------------------------------ */
/* Settings is the one admin section with no tool behind it yet, so it  */
/* stays an honest preparation page rather than a fabricated screen.    */
/* ------------------------------------------------------------------ */

const ADMIN_PLACEHOLDERS: Record<
  string,
  { eyebrow: string; title: string; description: string; bullets: string[] }
> = {
  settings: {
    eyebrow: 'Platform',
    title: 'Settings',
    description:
      'Platform configuration — market details, feature flags, verification rules and admin account management. None of this is editable yet: the values it would edit live in environment configuration, not in the database, so there is nothing here to change safely from a browser.',
    bullets: [
      'Market and brand configuration',
      'Verification and moderation rules',
      'Manual admin account management — admin accounts are never created by public signup',
    ],
  },
};

export function AdminPlaceholderSection({ section }: { section: string }) {
  const data = ADMIN_PLACEHOLDERS[section];
  if (!data) return null;
  return (
    <main className="admin">
      <div className="admin__inner">
        <header className="console-head">
          <div className="console-head__text">
            <span className="console-head__eyebrow">{data.eyebrow}</span>
            <h1 className="console-head__title">{data.title}</h1>
            <p className="console-head__sub">{data.description}</p>
          </div>
        </header>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">What this section will hold</h2>
            <span className="panel__hint">Not yet connected</span>
          </div>
          <ul className="records records--bare">
            {data.bullets.map((b) => (
              <li key={b} className="record">
                <div className="record__main">
                  <p className="record__title">{b}</p>
                </div>
                <span className="status-pill">Planned</span>
              </li>
            ))}
          </ul>
          <div className="panel__foot">
            <Button variant="ghost" size="sm" to="/admin" icon={ArrowLeft}>
              Back to overview
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
