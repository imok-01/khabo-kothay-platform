import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Compass, MapPin, ArrowRight, Search, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { collections } from '../data/collections';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantImage from '../components/RestaurantImage';
import SectionHeading from '../components/SectionHeading';
import SearchBar from '../components/SearchBar';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';
import type { Restaurant } from '../types';

function leadPhoto(restaurant: Restaurant | undefined) {
  return restaurant ? selectRestaurantPhotos(restaurant, 'card').photos[0] : undefined;
}

const MOODS = [
  { label: 'Date night', to: '/explore?q=date%20night' },
  { label: 'Family dinner', to: '/explore?family=1' },
  { label: 'Quick lunch', to: '/explore?mealType=Lunch' },
  { label: 'Late night', to: '/explore?q=late%20night' },
  { label: 'Budget friendly', to: '/explore?budget=Budget' },
  { label: 'Celebration', to: '/explore?q=celebration' },
];

const QUICK_ACTIONS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Top rated', to: '/explore?sortBy=rating', icon: Sparkles },
  { label: 'Open now', to: '/explore?openNow=1&sortBy=distance', icon: Search },
  { label: 'Hidden gems', to: '/explore?q=hidden%20gems', icon: Compass },
];

export default function DiscoverPage() {
  const { status, data } = useRestaurants();
  usePageTitle('Discover');

  const restaurants = useMemo(() => data ?? [], [data]);

  const popularCuisines = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) for (const c of r.cuisines) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [restaurants]);

  const popularAreas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) if (r.location) counts.set(r.location, (counts.get(r.location) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [restaurants]);

  const byId = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);

  const previewGuides = collections.slice(0, 4);

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <span className="hero__eyebrow"><Compass size={14} aria-hidden="true" /> Discover</span>
          <h1 className="hero__title">What are you in the mood for?</h1>
          <p className="hero__subtitle">
            Choose a mood, a cuisine or a neighbourhood — or search when you already know what you want.
          </p>
          <SearchBar variant="hero" restaurants={restaurants} />
          <div className="surprise__actions" style={{ justifyContent: 'flex-start' }}>
            <Link to="/explore" className="btn btn--ghost btn--lg"><Sparkles size={16} aria-hidden="true" /> Surprise me</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Not sure yet?"
            title="Browse by mood"
            lede="Start with how you want to eat — we'll handle the rest."
          />
          <div className="tile-grid tile-grid--cuisines">
            {MOODS.map((m) => (
              <Link
                key={m.label}
                to={m.to}
                className="tile"
              >
                <div className="tile__body">
                  <strong>{m.label}</strong>
                  <span>Explore <ArrowRight size={13} aria-hidden="true" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading
            eyebrow="What are you craving?"
            title="Browse cuisines"
            lede="Every kitchen in the city, one craving at a time."
          />
          <div className="tile-grid tile-grid--cuisines">
            {popularCuisines.map(([c, count], i) => (
              <Link
                key={c}
                to={`/cuisine/${encodeURIComponent(c)}`}
                className={`tile ${i === 0 ? 'tile--featured' : ''}`}
              >
                <div className="tile__body">
                  <strong>{c}</strong>
                  <span>{count} places</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Where in the city?"
            title="Browse areas"
            lede="From Gulshan's fine dining to Banani's late-night bites."
          />
          <div className="tile-grid tile-grid--neighbourhoods">
            {popularAreas.map(([n, count]) => {
              const cover = restaurants.find((r) => r.location === n);
              return (
                <Link key={n} to={`/area/${encodeURIComponent(n)}`} className="tile tile--location">
                  <div className="tile__media">
                    {cover && <RestaurantImage source={leadPhoto(cover)} name={n} width={160} fallback="monogram" />}
                  </div>
                  <div className="tile__body">
                    <strong><MapPin size={13} aria-hidden="true" /> {n}</strong>
                    <span>{count} places</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Curated shortlists"
            title="Guides"
            lede="Editorially curated lists for a mood, a moment or a craving — every guide is built from real data."
            action={{ label: 'View all guides', to: '/guides' }}
          />
          {status === 'loading' && !data ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="collection-grid">
              {previewGuides.map((c) => {
                const cover = byId.get(c.coverRestaurantId);
                return (
                  <Link key={c.slug} to={`/guides/${c.slug}`} className="collection-card">
                    <div className="collection-card__media">
                      {cover && <RestaurantImage source={leadPhoto(cover)} name={c.title} width={560} />}
                    </div>
                    <div className="collection-card__body">
                      <h3>{c.title}</h3>
                      <p>{c.description}</p>
                      <span className="collection-card__count">View guide <ArrowRight size={13} aria-hidden="true" /></span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Shortcuts"
            title="Jump straight to results"
            lede="Already know the kind of place you want? Skip the browsing."
          />
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
              <Link key={label} to={to} className="btn btn--ghost btn--lg">
                <Icon size={16} aria-hidden="true" /> {label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
