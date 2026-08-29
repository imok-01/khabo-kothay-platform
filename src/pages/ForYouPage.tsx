import { Compass, Bookmark, LogIn, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { Button } from '../components/ui';

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
            <Button variant="primary" to="/saved" icon={Bookmark}>View your saved places</Button>
          ) : (
            /* `LogIn`, not `UserRound`: the mark should say what the press
               does, and a person-shape says who you are. The signed-in half
               keeps its own verb too — that one goes to a collection, so it
               carries the bookmark it is made of. */
            <Button variant="primary" to="/login" icon={LogIn}>Sign in to get started</Button>
          )}
          <Button variant="ghost" to="/discover" icon={Compass}>Discover instead</Button>
        </div>
      </div>
    </main>
  );
}
