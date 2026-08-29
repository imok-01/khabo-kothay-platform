import { MemoryRouter } from 'react-router-dom';
import { LucideProvider } from 'lucide-react';
import { FavoritesProvider } from './context/FavoritesContext';
import { SavedProvider } from './context/SavedContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import { CompareProvider } from './context/CompareContext';
import { AuthProvider } from './context/AuthContext';
import App from './App';

/**
 * Server render entry used by scripts/prerender.mjs.
 *
 * Mirrors the provider tree in main.tsx exactly (same order), except the
 * BrowserRouter is swapped for a MemoryRouter pinned to the requested URL, so
 * the static HTML matches what the client hydrates for that route. In the
 * browser this module is never loaded — the SPA entry (main.tsx) is untouched.
 *
 * LucideProvider has to be here as well as in main.tsx: it sets the icon
 * stroke weight as a context default, so leaving it out would prerender every
 * icon at stroke 2 and the client's first render would visibly re-weight them.
 */
export function renderApp(url: string) {
  return (
    <LucideProvider strokeWidth={1.75}>
      <MemoryRouter initialEntries={[url]}>
        <AuthProvider>
          <FavoritesProvider>
            <SavedProvider>
              <RecentlyViewedProvider>
                <CompareProvider>
                  <App />
                </CompareProvider>
              </RecentlyViewedProvider>
            </SavedProvider>
          </FavoritesProvider>
        </AuthProvider>
      </MemoryRouter>
    </LucideProvider>
  );
}
