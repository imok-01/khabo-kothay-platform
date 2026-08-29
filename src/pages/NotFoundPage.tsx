import { MapPin } from 'lucide-react';
import { usePageTitle } from '../lib/usePageTitle';
import EmptyState from '../components/EmptyState';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <main className="section">
      <div className="section__inner">
        <EmptyState
          icon={<MapPin size={36} />}
          title="404 — lost in the city"
          message="No page lives at this address. Everything else is where you left it."
          actionLabel="Back to the front page"
          actionTo="/"
        />
      </div>
    </main>
  );
}
