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
          message="This page doesn't exist. Even the best food explorers get lost sometimes."
          actionLabel="Back to the kitchen (home)"
          actionTo="/"
        />
      </div>
    </main>
  );
}
