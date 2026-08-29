import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, ArrowRight } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { NEIGHBORHOODS } from '../hooks/useTaxonomy';
import RestaurantCard from '../components/RestaurantCard';
import SectionHeading from '../components/SectionHeading';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';
import { Button } from '../components/ui';

export default function AreaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { status, data } = useRestaurants();
  const area = slug ? decodeURIComponent(slug) : '';
  usePageTitle(area ? `Restaurants in ${area}` : 'Area');

  const restaurants = useMemo(() => {
    if (!area || !data) return [];
    const needle = area.trim().toLowerCase();
    return data.filter((r) => (r.location ?? '').toLowerCase() === needle);
  }, [area, data]);

  const known = NEIGHBORHOODS.some((n) => n.toLowerCase() === area.trim().toLowerCase());

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <span className="hero__eyebrow"><MapPin size={14} aria-hidden="true" /> Area</span>
          <h1 className="hero__title">Restaurants in {area}</h1>
          <p className="hero__subtitle">
            Local tables in {area}, drawn from real restaurant data.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="Neighbourhood"
            title={`${restaurants.length} ${restaurants.length === 1 ? 'place' : 'places'}`}
            lede={known ? `All restaurants we list in ${area}.` : undefined}
            action={{ label: 'Search all', to: '/search' }}
          />
          {status === 'loading' && !data ? (
            <SkeletonGrid count={8} />
          ) : restaurants.length === 0 ? (
            <EmptyState
              title={`${area} isn't on our map yet`}
              message="We build Dhaka neighbourhood by neighbourhood, and this one is still ahead of us. Search by cuisine, budget or dish instead — the places we do know are worth the detour."
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
          <SectionHeading eyebrow="Keep exploring" title="Other ways to discover" lede="Browse guides or cuisines." />
          <div className="surprise__actions" style={{ justifyContent: 'flex-start' }}>
            {/* `iconAfter`, not a leading arrow. A right-pointing arrow in
                front of its own label points back at the margin; behind it,
                it points where the link goes — and the primitive travels it
                3px on hover, which the hand-written icon never did. */}
            <Button variant="ghost" to="/guides" iconAfter={ArrowRight}>Browse guides</Button>
            <Button variant="ghost" to="/discover" iconAfter={ArrowRight}>Discover hub</Button>
          </div>
        </div>
      </section>
    </main>
  );
}
