import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, X, ArrowRight, Trash2 } from 'lucide-react';
import { getAllRestaurantsSync } from '../hooks/useRestaurantData';
import type { Restaurant } from '../types';
import { priceForTwoDisplay } from '../lib/priceDisplay';
import { formatOpeningHours } from '../lib/openHours';
import { useCompare } from '../context/CompareContext';
import { effectiveRating, effectiveReviewCount } from '../lib/ratings';
import RatingStars from './RatingStars';
import { Button, Dialog } from './ui';

export default function CompareTray() {
  const { compareIds, toggleCompare, clearCompare } = useCompare();
  const [modalOpen, setModalOpen] = useState(false);
  const items = useMemo(() => {
    const all = getAllRestaurantsSync();
    return compareIds.map((id) => all.find((r) => r.id === id)).filter((r): r is Restaurant => Boolean(r));
  }, [compareIds]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="compare-tray" role="region" aria-label="Comparison tray">
        <div className="compare-tray__items">
          {items.map((r) => (
            <span key={r.id} className="compare-tray__item">
              {r.name.split(' ')[0]}
              <button
                type="button"
                className="compare-tray__remove"
                aria-label={`Remove ${r.name} from comparison`}
                onClick={() => toggleCompare(r.id)}
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <span className="compare-tray__hint">{items.length}/3</span>
        <Button variant="primary" icon={Scale} onClick={() => setModalOpen(true)}>
          Compare
        </Button>
      </div>

      {modalOpen && (
        <Dialog
          open
          onClose={() => setModalOpen(false)}
          size="lg"
          eyebrow="Side by side"
          title="Compare places"
          footer={
            <>
              {items.map((r) => (
                <Button
                  key={r.id}
                  variant="ghost"
                  to={`/restaurant/${r.id}`}
                  iconAfter={ArrowRight}
                  onClick={() => setModalOpen(false)}
                >
                  View {r.name.split(' ')[0]}
                </Button>
              ))}
              {/* Clearing the tray throws away a comparison someone built by
                  hand, so it takes the trash mark and `subtle`'s weight — the
                  three ways forward stay the loudest things in the row. */}
              <Button
                variant="subtle"
                icon={Trash2}
                onClick={() => { clearCompare(); setModalOpen(false); }}
              >
                Clear
              </Button>
            </>
          }
        >
          <table className="compare-table">
            <thead>
              <tr>
                <th />
                {items.map((r) => (
                  <th key={r.id}>
                    <Link to={`/restaurant/${r.id}`} style={{ color: 'var(--primary)' }}>{r.name}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><th>Rating</th>{items.map((r) => <td key={r.id}><RatingStars rating={effectiveRating(r)} showValue /></td>)}</tr>
              <tr><th>Price for two</th>{items.map((r) => <td key={r.id}>{priceForTwoDisplay(r).label}</td>)}</tr>
              <tr><th>Cuisine</th>{items.map((r) => <td key={r.id}>{r.cuisines.join(', ') || '—'}</td>)}</tr>
              <tr><th>Location</th>{items.map((r) => <td key={r.id}>{r.location || '—'}</td>)}</tr>
              <tr><th>Hours</th>{items.map((r) => {
                const rows = formatOpeningHours(r.openingHours);
                const label = rows
                  ? rows.length > 1
                    ? `${rows[0].day} ${rows[0].label} · ${rows.length} days`
                    : `${rows[0].day}: ${rows[0].label}`
                  : r.openingHours
                    ? 'Hours being verified'
                    : 'Not recorded';
                return <td key={r.id}>{label}</td>;
              })}</tr>
              <tr><th>Diet</th>{items.map((r) => <td key={r.id}>{r.vegUnknown ? 'Unknown' : r.isVeg ? 'Veg' : 'Non-veg'}</td>)}</tr>
              <tr><th>Amenities</th>{items.map((r) => <td key={r.id}>{[r.hasDelivery && 'Delivery', r.hasOutdoorSeating && 'Outdoor', r.isFamilyFriendly && 'Family friendly'].filter(Boolean).join(' · ') || 'Dine-in'}</td>)}</tr>
              <tr><th>Reviews</th>{items.map((r) => <td key={r.id}>{effectiveReviewCount(r).toLocaleString('en-IN')}</td>)}</tr>
            </tbody>
          </table>
        </Dialog>
      )}
    </>
  );
}
