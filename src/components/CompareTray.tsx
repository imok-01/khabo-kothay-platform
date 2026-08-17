import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, X } from 'lucide-react';
import { restaurantService } from '../services/restaurantService';
import type { Restaurant } from '../types';
import { formatCurrency } from '../lib/format';
import { useCompare } from '../context/CompareContext';
import { effectiveRating, effectiveReviewCount } from '../lib/ratings';
import RatingStars from './RatingStars';

export default function CompareTray() {
  const { compareIds, toggleCompare, clearCompare } = useCompare();
  const [modalOpen, setModalOpen] = useState(false);
  const items = useMemo(() => {
    const all = restaurantService.getAllSync();
    return compareIds.map((id) => all.find((r) => r.id === id)).filter((r): r is Restaurant => Boolean(r));
  }, [compareIds]);

  // Close the modal on Escape.
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

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
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
        <span className="compare-tray__hint">{items.length}/3</span>
        <button type="button" className="btn btn--primary" onClick={() => setModalOpen(true)}>
          <Scale size={15} aria-hidden="true" /> Compare
        </button>
      </div>

      {modalOpen && (
        <div className="compare-modal" role="dialog" aria-modal="true" aria-label="Compare restaurants" onClick={() => setModalOpen(false)}>
          <div className="compare-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="section-heading" style={{ marginBottom: 'var(--s4)' }}>
              <div>
                <span className="section-heading__eyebrow">Side by side</span>
                <h2>Compare places</h2>
              </div>
              <button type="button" className="btn btn--subtle" onClick={() => setModalOpen(false)}>
                <X size={16} /> Close
              </button>
            </div>
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
                <tr><th>Price for two</th>{items.map((r) => <td key={r.id}>{r.priceForTwo > 0 ? formatCurrency(r.priceForTwo) : 'Not listed'}</td>)}</tr>
                <tr><th>Cuisine</th>{items.map((r) => <td key={r.id}>{r.cuisines.join(', ') || '—'}</td>)}</tr>
                <tr><th>Location</th>{items.map((r) => <td key={r.id}>{r.location || '—'}</td>)}</tr>
                <tr><th>Hours</th>{items.map((r) => <td key={r.id}>{r.openingHours || 'Not recorded'}</td>)}</tr>
                <tr><th>Diet</th>{items.map((r) => <td key={r.id}>{r.vegUnknown ? 'Unknown' : r.isVeg ? 'Veg' : 'Non-veg'}</td>)}</tr>
                <tr><th>Amenities</th>{items.map((r) => <td key={r.id}>{[r.hasDelivery && 'Delivery', r.hasOutdoorSeating && 'Outdoor', r.isFamilyFriendly && 'Family friendly'].filter(Boolean).join(' · ') || 'Dine-in'}</td>)}</tr>
                <tr><th>Reviews</th>{items.map((r) => <td key={r.id}>{effectiveReviewCount(r).toLocaleString('en-IN')}</td>)}</tr>
              </tbody>
            </table>
            <div style={{ marginTop: 'var(--s4)', display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
              {items.map((r) => (
                <Link key={r.id} to={`/restaurant/${r.id}`} className="btn btn--ghost" onClick={() => setModalOpen(false)}>
                  View {r.name.split(' ')[0]}
                </Link>
              ))}
              <button type="button" className="btn btn--subtle" onClick={() => { clearCompare(); setModalOpen(false); }}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
