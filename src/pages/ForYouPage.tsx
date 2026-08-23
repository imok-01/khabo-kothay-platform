import { Link } from 'react-router-dom';
import { Compass, UserRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';

export default function ForYouPage() {
  const { session } = useAuth();
  usePageTitle('For you');

  return (
    <main className="section">
      <div className="section__inner" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <span className="hero__eyebrow" style={{ justifyContent: 'center', display: 'inline-flex' }}>
          <Sparkles size={14} aria-hidden="true" /> For you
        </span>
        <h1 className="hero__title" style={{ justifyContent: 'center', display: 'flex' }}>
          Your personal picks are coming
        </h1>
        <p className="hero__subtitle">
          We're building a taste profile from the restaurants you favourite and visit, so recommendations can explain
          themselves with real signals — never a fabricated "because you like" line. This page is the future home for
          that experience.
        </p>

        <div className="surprise__actions" style={{ justifyContent: 'center' }}>
          {session ? (
            <Link to="/favorites" className="btn btn--primary">
              <UserRound size={16} aria-hidden="true" /> View your favourites
            </Link>
          ) : (
            <Link to="/login" className="btn btn--primary">
              <UserRound size={16} aria-hidden="true" /> Sign in to get started
            </Link>
          )}
          <Link to="/discover" className="btn btn--ghost">
            <Compass size={16} aria-hidden="true" /> Discover instead
          </Link>
        </div>
      </div>
    </main>
  );
}
