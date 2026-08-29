import {
  Building2,
  Cake,
  Camera,
  ChefHat,
  Coffee,
  Flame,
  Heart,
  Landmark,
  Laptop,
  Leaf,
  MoonStar,
  Music,
  Repeat,
  Sparkles,
  ThumbsUp,
  Users,
  UsersRound,
  UtensilsCrossed,
  Wallet,
  Zap,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import type { Restaurant } from '../types';
import type { RestaurantSignal, SignalType } from '../domain/place';

const SIGNAL_ICONS: Record<SignalType, LucideIcon> = {
  value: Wallet,
  portions: UtensilsCrossed,
  family: Users,
  dish: ChefHat,
  coffee: Coffee,
  dessert: Cake,
  vibe: Sparkles,
  revisit: Repeat,
  group: UsersRound,
  popular: Flame,
  late: MoonStar,
  date: Heart,
  quick: Zap,
  heritage: Landmark,
  service: ThumbsUp,
  fresh: Leaf,
  spice: Flame,
  quiet: BookOpen,
  work: Laptop,
  live: Music,
  views: Building2,
  photo: Camera,
};

const SOURCE_LABELS: Record<RestaurantSignal['sources'][number], string> = {
  reviews: 'from community reviews',
  visits: 'from visit behaviour',
  tags: 'from community tags',
  metadata: 'from restaurant details',
  editorial: 'curated by our editors',
};

export default function RestaurantSignals({ restaurant }: { restaurant: Restaurant }) {
  const signals = restaurant.khabo.signals;
  if (signals.length === 0) return null;
  return (
    <ul className="signals" aria-label={`Why people like ${restaurant.name}`}>
      {signals.map((s) => {
        const Icon = SIGNAL_ICONS[s.type] ?? Sparkles;
        return (
          <li key={s.id} className="signal">
            <Icon size={16} className="signal__icon" aria-hidden="true" />
            <span className="signal__label">{s.label}</span>
            <span
              className="signal__strength"
              role="img"
              aria-label={`${s.strength}% of reviewers agree — ${s.sources.map((x) => SOURCE_LABELS[x]).join(', ')}`}
              title={`${s.strength}% ${s.sources.map((x) => SOURCE_LABELS[x]).join(' · ')}`}
            >
              <span className="signal__strength-fill" style={{ width: `${s.strength}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
