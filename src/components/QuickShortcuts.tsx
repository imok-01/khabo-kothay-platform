import { Link } from 'react-router-dom';
import { Navigation, Wallet, UtensilsCrossed, Star, MapPin, Flame, Pizza, Soup, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatCurrency } from '../lib/format';

interface Shortcut {
  label: string;
  to: string;
  icon: LucideIcon;
  primary?: boolean;
}

/**
 * Cost cap behind the price shortcut, in cost-for-two taka.
 *
 * It is deliberately not a round ৳500: the catalogue's cheapest recorded
 * cost-for-two is ৳600, so the old "Under ৳500" chip sent every visitor from
 * the homepage to an empty results page. At this cap the chip lands on real
 * venues, and the label is generated from it so the two can never disagree.
 */
const PRICE_SHORTCUT_CAP = 1000;

// Discovery shortcuts are built from the real Banani/Gulshan dataset — every
// one of them leads to genuine results, never to an empty filter page.
const SHORTCUTS: Shortcut[] = [
  { label: 'Near me', to: '/explore?sortBy=distance', icon: Navigation },
  {
    label: `Under ${formatCurrency(PRICE_SHORTCUT_CAP)}`,
    to: `/explore?maxPrice=${PRICE_SHORTCUT_CAP}`,
    icon: Wallet,
  },
  { label: 'Bangladeshi food', to: '/explore?cuisine=Bangladeshi&sortBy=rating', icon: Soup, primary: true },
  { label: 'Chinese', to: '/explore?cuisine=Chinese&sortBy=rating', icon: UtensilsCrossed },
  { label: 'Italian', to: '/explore?cuisine=Italian&sortBy=rating', icon: Pizza },
  { label: 'Fast food', to: '/explore?cuisine=Fast+Food&sortBy=rating', icon: Flame },
  { label: 'Gulshan', to: '/explore?location=Gulshan&sortBy=rating', icon: MapPin },
  { label: 'Banani', to: '/explore?location=Banani&sortBy=rating', icon: MapPin },
  { label: 'Highly rated', to: '/explore?sortBy=rating', icon: Star },
  { label: 'Delivers', to: '/explore?delivery=1&sortBy=rating', icon: Truck },
];

export default function QuickShortcuts() {
  return (
    <div className="quick-strip" aria-label="Quick discovery shortcuts">
      {SHORTCUTS.map(({ label, to, icon: Icon, primary }) => (
        <Link key={label} to={to} className={`quick-chip ${primary ? 'quick-chip--primary' : ''}`}>
          <Icon size={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </div>
  );
}
