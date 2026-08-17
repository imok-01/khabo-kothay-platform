import { Link } from 'react-router-dom';
import { Navigation, Wallet, UtensilsCrossed, Star, MapPin, Flame, Pizza, Soup, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Shortcut {
  label: string;
  to: string;
  icon: LucideIcon;
  primary?: boolean;
}

// Discovery shortcuts are built from the real Banani/Gulshan dataset — every
// one of them leads to genuine results, never to an empty filter page.
const SHORTCUTS: Shortcut[] = [
  { label: 'Near me', to: '/explore?sortBy=distance', icon: Navigation },
  { label: 'Under ৳500', to: '/explore?maxPrice=500', icon: Wallet },
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
          <Icon size={15} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </div>
  );
}
