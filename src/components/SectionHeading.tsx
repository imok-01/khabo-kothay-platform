import { Link } from 'react-router-dom';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  lede?: string;
  action?: { label: string; to: string; onClick?: () => void };
}

export default function SectionHeading({ eyebrow, title, lede, action }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-heading__eyebrow">{eyebrow}</span>
        <h2 className="section-heading__title">{title}</h2>
        {lede && <p className="section-heading__lede">{lede}</p>}
      </div>
      {action &&
        (action.onClick ? (
          <button type="button" className="section-heading__action" onClick={action.onClick}>
            {action.label}
          </button>
        ) : (
          <Link to={action.to} className="section-heading__action">
            {action.label}
          </Link>
        ))}
    </div>
  );
}
