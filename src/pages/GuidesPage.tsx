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

const FEATURED_SLUG = 'italian-evenings';

// Presentation-only grouping of the existing collections. The data model has
// no category field and is auto-generated, so we derive the group from each
// collection's `exploreParams` instead of hard-coding slugs — that way a new
// collection is grouped automatically and never silently dropped.
const GROUP_ORDER: { key: 'area' | 'cuisine' | 'occasion'; label: string }[] = [
  { key: 'area', label: 'By area' },
  { key: 'cuisine', label: 'By cuisine' },
  { key: 'occasion', label: 'By occasion & convenience' },
];

const groupKeyOf = (c: (typeof collections)[number]): 'area' | 'cuisine' | 'occasion' => {
  if ('location' in c.exploreParams) return 'area';
  if ('cuisine' in c.exploreParams) return 'cuisine';
  return 'occasion';
};

export default function GuidesPage() {
  const { status, data } = useRestaurants();
  usePageTitle('Khabo Kothay restaurant guides');

  const byId = useMemo(() => new Map((data ?? []).map((r) => [r.id, r])), [data]);

  const featured = collections.find((c) => c.slug === FEATURED_SLUG);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((g) => ({
      label: g.label,
      items: collections.filter((c) => c.slug !== FEATURED_SLUG && groupKeyOf(c) === g.key),
    })).filter((g) => g.items.length > 0);
  }, []);

  const fcover = featured ? byId.get(featured.coverRestaurantId) : undefined;

  return (
    <main>
      <section className="hero hero--compact">
        <div className="hero__inner">
          <span className="hero__eyebrow"><BookOpen size={14} aria-hidden="true" /> Guides</span>
          <h1 className="hero__title">Find the right restaurant for every moment</h1>
          <p className="hero__subtitle">
            Shortlists of places worth trying — built from real Dhaka restaurant data.
          </p>
        </div>
      </section>

      {featured && (
        <section className="section">
          <div className="section__inner">
            <SectionHeading
              eyebrow="Khabo Kothay guide"
              title="Featured guide"
              lede="A shortlist we're proud of — a good place to start."
            />
            <Link to={`/guides/${featured.slug}`} className="collection-card">
              <div className="collection-card__media">
                {fcover && <RestaurantImage source={leadPhoto(fcover)} name={featured.title} width={560} />}
              </div>
              <div className="collection-card__body">
                <h3>{featured.title}</h3>
                <p>{featured.description}</p>
                <span className="collection-card__count">View guide <ArrowRight size={13} aria-hidden="true" /></span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {grouped.map((group) => (
        <section key={group.label} className="section section--tint">
          <div className="section__inner">
            <SectionHeading eyebrow="Guides" title={group.label} lede="Shortlists for this kind of craving or occasion." />
            {status === 'loading' && !data ? (
              <SkeletonGrid count={Math.max(group.items.length, 1)} />
            ) : (
              <div className="collection-grid">
                {group.items.map((c) => {
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
      ))}
    </main>
  );
}
