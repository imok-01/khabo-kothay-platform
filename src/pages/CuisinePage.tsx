import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { UtensilsCrossed, ArrowRight } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { CUISINES } from '../hooks/useTaxonomy';
import RestaurantCard from '../components/RestaurantCard';
import SectionHeading from '../components/SectionHeading';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';

export default function CuisinePage() {
  const { slug } = useParams<{ slug: string }>();
  const { status, data } = useRestaurants();
  const cuisine = slug ? decodeURIComponent(slug) : '';
  usePageTitle(cuisine ? `${cuisine} restaurants` : 'Cuisine');

  const restaurants = useMemo(() => {
    if (!cuisine || !data) return [];
    const needle = cuisine.trim().toLowerCase();
    return data.filter((r) => r.cuisines.some((c) => c.toLowerCase() === needle));
  }, [cuisine, data]);

  const known = CUISINES.some((c) => c.toLowerCase() === cuisine.trim().toLowerCase());

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <span className="hero__eyebrow"><UtensilsCrossed size={14} aria-hidden="true" /> Cuisine</span>
          <h1 className="hero__title">{cuisine} restaurants</h1>
          <p className="hero__subtitle">
            Every {cuisine} table we cover, drawn from real restaurant data.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Cuisine"
            title={`${restaurants.length} ${restaurants.length === 1 ? 'place' : 'places'}`}
            lede={known ? `All ${cuisine} restaurants we list.` : undefined}
            action={{ label: 'Search all', to: '/search' }}
          />
          {status === 'loading' && !data ? (
            <SkeletonGrid count={8} />
          ) : restaurants.length === 0 ? (
            <EmptyState
              title={`No ${cuisine} restaurants listed yet`}
              message="We don't have live matches for this cuisine right now. Try a broader search."
              actionLabel="Search restaurants"
              actionTo="/search"
            />
          ) : (
            <div className="grid">
              {restaurants.map((r, i) => (
                <RestaurantCard key={r.id} restaurant={r} variant={i === 0 ? 'featured' : 'standard'} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading eyebrow="Keep exploring" title="Other ways to discover" lede="Browse guides or areas." />
          <div className="surprise__actions" style={{ justifyContent: 'flex-start' }}>
            <Link to="/guides" className="btn btn--ghost"><ArrowRight size={15} aria-hidden="true" /> Browse guides</Link>
            <Link to="/discover" className="btn btn--ghost"><ArrowRight size={15} aria-hidden="true" /> Discover hub</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
