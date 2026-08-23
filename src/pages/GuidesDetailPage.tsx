import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { getCollection, collections } from '../data/collections';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantImage from '../components/RestaurantImage';
import SectionHeading from '../components/SectionHeading';
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';
import type { Restaurant } from '../types';

function leadPhoto(restaurant: Restaurant | undefined) {
  return restaurant ? selectRestaurantPhotos(restaurant, 'card').photos[0] : undefined;
}

export default function GuidesDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { status, data } = useRestaurants();
  const collection = slug ? getCollection(slug) : undefined;
  usePageTitle(collection ? collection.title : 'Guide');

  const restaurants = useMemo(() => {
    if (!collection || !data) return [];
    return data.filter((r) => collection.match(r));
  }, [collection, data]);

  if (!collection) {
    return (
      <main className="section">
        <div className="section__inner">
          <EmptyState
            title="Guide not found"
              message="We couldn't find that guide. Browse all our guides instead."
            actionLabel="All guides"
            actionTo="/guides"
          />
        </div>
      </main>
    );
  }

  const cover = data?.find((r) => r.id === collection.coverRestaurantId);
  const others = collections.filter((c) => c.slug !== collection.slug).slice(0, 4);
  const exploreHref = '/explore?' + new URLSearchParams(collection.exploreParams).toString();
  const byId = useMemo(() => new Map((data ?? []).map((r) => [r.id, r])), [data]);

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner hero__inner--split">
          <div className="hero__copy">
            <span className="hero__eyebrow"><BookOpen size={14} aria-hidden="true" /> Restaurant shortlist</span>
            <h1 className="hero__title">{collection.title}</h1>
            <p className="hero__subtitle">{collection.description}</p>
          </div>
          {cover && (
            <div className="hero__media">
              <RestaurantImage source={leadPhoto(cover)} name={cover.name} width={420} />
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading
            eyebrow="In this guide"
            title={`${restaurants.length} ${restaurants.length === 1 ? 'place' : 'places'}`}
            lede="Every venue below matches this guide, built from real restaurant data."
            action={{ label: 'Explore restaurants', to: exploreHref }}
          />
          {status === 'loading' && !data ? (
            <SkeletonGrid count={8} />
          ) : restaurants.length === 0 ? (
            <EmptyState
              title="No matching restaurants yet"
              message="This guide doesn't have live matches right now. Check back as our data grows."
              actionLabel="Explore restaurants"
              actionTo={exploreHref}
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

      {others.length > 0 && (
        <section className="section section--tint">
          <div className="section__inner">
            <SectionHeading eyebrow="More to explore" title="Other guides" lede="Keep discovering." />
            <div className="collection-grid">
              {others.map((c) => {
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
      )}
    </main>
  );
}
