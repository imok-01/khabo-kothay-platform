import { MemoryRouter } from 'react-router-dom';
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
 */
export function renderApp(url: string) {
  return (
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
  );
}
