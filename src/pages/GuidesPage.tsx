import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { collections } from '../data/collections';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantImage from '../components/RestaurantImage';
import SectionHeading from '../components/SectionHeading';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';
import type { Restaurant } from '../types';

function leadPhoto(restaurant: Restaurant | undefined) {
  return restaurant ? selectRestaurantPhotos(restaurant, 'card').photos[0] : undefined;
}

export default function GuidesPage() {
  const { status, data } = useRestaurants();
  usePageTitle('Guides');

  const byId = useMemo(() => new Map((data ?? []).map((r) => [r.id, r])), [data]);

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <span className="hero__eyebrow"><BookOpen size={14} aria-hidden="true" /> Guides</span>
          <h1 className="hero__title">Guides &amp; collections</h1>
          <p className="hero__subtitle">
            Editorially curated lists for a mood, a moment or a craving — every guide is built from real restaurant data.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section__inner">
          <SectionHeading eyebrow="Curated" title="All guides" lede="Pick a guide to start exploring." />
          {status === 'loading' && !data ? (
            <SkeletonGrid count={8} />
          ) : (
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
          )}
        </div>
      </section>
    </main>
  );
}
