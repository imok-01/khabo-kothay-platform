import { MessageSquare } from 'lucide-react';

// Feature flag — set VITE_ENABLE_REVIEW_HIGHLIGHTS=false to hide entirely (removable in one env var)
const ENABLED = import.meta.env.VITE_ENABLE_REVIEW_HIGHLIGHTS !== 'false';

import type { ReviewSample } from '../repositories/reviewSamplesRepository';

interface Props {
  samples: ReviewSample[];
  status: 'loading' | 'ready' | 'empty' | 'error';
}

export default function CustomerHighlights({ samples, status }: Props) {
  if (!ENABLED) return null;
  if (status === 'empty') return null;
  if (status === 'loading') return null;
  if (status === 'error') return null;
  if (samples.length === 0) return null;

  return (
    <div className="customer-highlights" aria-label="Highlighted reviews">
      <h3 className="t-sm" style={{ margin: 'var(--s3) 0 var(--s2)', color: 'var(--ink)' }}>
        3 highlighted reviews
      </h3>
      <div className="reviews">
        {samples.slice(0, 3).map((s) => (
          <blockquote key={s.id} className="review review--external" data-testid="customer-highlight">
            <div className="review__head">
              <span className="review__avatar" aria-hidden="true">
                {(s.attribution || 'G').charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{s.attribution || 'Google User'}</strong>
                <span className="chip chip--meal" style={{ marginLeft: 6 }}>
                  <MessageSquare size={11} aria-hidden="true" style={{ verticalAlign: '-1px', marginRight: 4 }} />
                  Google
                </span>
              </div>
            </div>
            <p>“{s.reviewText}”</p>
          </blockquote>
        ))}
      </div>
    </div>
  );
}
