import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * Phase C section heading.
 *
 * The older `SectionHeading` stacked eyebrow, title and lede in one column
 * with the action floated right, which at display type sizes left three
 * different measures ragged against each other. This splits the heading into
 * two columns — title left at full weight, supporting copy and the action in a
 * narrower right column — and drops back to a stack below 1100px.
 *
 * `SectionHeading` is untouched and still used by the pages outside Phase C
 * scope; this one owns the discovery surfaces.
 */

export interface BandHeadAction {
  label: string;
  to?: string;
  onClick?: () => void;
}

export interface BandHeadProps {
  eyebrow: string;
  /** ReactNode so a title can carry an <em> accent word. */
  title: ReactNode;
  lede?: string;
  action?: BandHeadAction;
  /** split (default) · stack · center */
  align?: 'split' | 'stack' | 'center';
  /** Renders the title as <h1> — used once per page at most. */
  as?: 'h1' | 'h2';
}

export default function BandHead({ eyebrow, title, lede, action, align = 'split', as = 'h2' }: BandHeadProps) {
  const modifier = align === 'stack' ? ' band-head--stack' : align === 'center' ? ' band-head--center' : '';
  const Title = as;

  return (
    <div className={`band-head${modifier}`}>
      <div>
        <span className="band-head__eyebrow">{eyebrow}</span>
        <Title className="band-head__title">{title}</Title>
      </div>
      {(lede || action) && (
        <div className="band-head__side">
          {lede && <p className="band-head__lede">{lede}</p>}
          {action &&
            (action.to ? (
              <Link to={action.to} className="band-head__action">
                {action.label} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <button type="button" className="band-head__action" onClick={action.onClick}>
                {action.label} <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
