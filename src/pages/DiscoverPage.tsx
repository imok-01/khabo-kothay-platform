import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Compass, BookOpen, UtensilsCrossed, MapPin, ArrowRight } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { collections } from '../data/collections';
import { hiddenGems, worthTheTrip } from '../hooks/useRecommendations';
import { effectiveRating } from '../lib/ratings';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantImage from '../components/RestaurantImage';
import SectionHeading from '../components/SectionHeading';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';
import type { Restaurant } from '../types';

function leadPhoto(restaurant: Restaurant | undefined) {
  return restaurant ? selectRestaurantPhotos(restaurant, 'card').photos[0] : undefined;
}

export default function DiscoverPage() {
  const { status, data } = useRestaurants();
  usePageTitle('Discover restaurants');

  const restaurants = useMemo(() => data ?? [], [data]);

  const trending = useMemo(
    () =>
      [...restaurants]
        .sort((a, b) => effectiveRating(b) - effectiveRating(a))
        .slice(0, 8),
    [restaurants],
  );

  const popularCuisines = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) for (const c of r.cuisines) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [restaurants]);

  const popularAreas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) if (r.location) counts.set(r.location, (counts.get(r.location) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [restaurants]);

  const gems = useMemo(() => hiddenGems(restaurants).slice(0, 8), [restaurants]);
  const trip = useMemo(() => worthTheTrip(restaurants).slice(0, 8), [restaurants]);

  const byId = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <span className="hero__eyebrow"><Compass size={14} aria-hidden="true" /> Discover</span>
          <h1 className="hero__title">Not sure where to eat?</h1>
          <p className="hero__subtitle">
            Browse by cuisine, neighbourhood or a curated guide — or jump straight into search when you know exactly what you want.
          </p>
          <div className="surprise__actions" style={{ justifyContent: 'flex-start' }}>
            <Link to="/search" className="btn btn--primary btn--lg"><UtensilsCrossed size={16} aria-hidden="true" /> Search restaurants</Link>
            <Link to="/guides" className="btn btn--ghost btn--lg"><BookOpen size={16} aria-hidden="true" /> Browse guides</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Right now"
            title="Trending"
            lede="The highest-rated tables across the city this week."
            action={{ label: 'Search all', to: '/search' }}
          />
          {status === 'loading' && restaurants.length === 0 ? (
            <SkeletonPlaceholder />
          ) : (
            <div className="grid">
              {trending.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} variant={i === 0 ? 'featured' : 'standard'} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Editorial"
            title="Guides"
            lede="Hand-picked collections for a mood, a moment or a craving."
            action={{ label: 'All guides', to: '/guides' }}
          />
          <div className="collection-grid">
            {collections.map((c) => {
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
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="What are you craving?"
            title="Popular cuisines"
            lede="The kitchens Dhaka is searching for most."
            action={{ label: 'Discover more', to: '/search' }}
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

      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Where in the city?"
            title="Popular areas"
            lede="The neighbourhoods with the most tables worth a visit."
            action={{ label: 'Discover more', to: '/search' }}
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

      <section className="section">
        <div className="section__inner">
          <SectionHeading eyebrow="Off the beaten path" title="Hidden gems" lede="Highly rated, quietly loved." action={{ label: 'Search all', to: '/search' }} />
          <div className="grid">
            {gems.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading eyebrow="Farther, but worth it" title="Worth the trip" lede="A little out of the way, unusually strong." action={{ label: 'Browse guides', to: '/guides' }} />
          <div className="grid">
            {trip.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function SkeletonPlaceholder() {
  return <SkeletonGrid count={8} />;
}
