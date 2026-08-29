import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LucideProvider } from 'lucide-react';
import { FavoritesProvider } from './context/FavoritesContext';
import { SavedProvider } from './context/SavedContext';
import { RecentlyViewedProvider } from './context/RecentlyViewedContext';
import { CompareProvider } from './context/CompareContext';
import { AuthProvider } from './context/AuthContext';
import App from './App';
// Load order matters. design-system.css owns every token and the base layer;
// the files after it own component rules only and must not declare tokens.
import './design-system.css';
import './index.css';
import './phase3.css';
import './editorial.css';
// Phase C: consumer discovery (home, cards, discover, navigation).
import './phase-c.css';
// Refinement pass: closes the seam between the Phase C editorial bands and the
// older product chrome (header, builder, footer). Loaded last, so anything
// responsive it re-declares has to re-state the earlier media queries — see
// the ordering note at the top of the file.
import './refine.css';
// Precision pass: gradient-text clipping, one header/footer alignment, the
// hero ledger, Discover's search row, Explore's editorial upgrade, the
// restaurant gallery and the menu overlay. Loaded last, so the same
// re-statement rule applies — see the ordering note at the top of the file.
import './polish.css';
// Signed-in layer: the KK admin console, the restaurant owner console, the
// profile + rewards surfaces and authentication. The three files above this
// one carry the current editorial language but contain no rules for any
// authenticated surface, which is why those screens still read as a stock
// admin panel. Loaded last, so the same re-statement rule applies — console.css
// section 14 lists every media query it has to restate and where it came from.
import './console.css';
// The homepage hero, rebuilt as a scene. A brand-new class namespace
// (`hero-scene` / `hero-plinth`) rather than an override of `hero-c`: the old
// hero's rules are spread across phase-c.css, refine.css and polish.css, and
// re-lighting a light-surfaced search console from three files at once is how
// ordering bugs are made. Loaded last, and nothing above it matches these
// selectors, so this file is the only owner of the hero.
import './hero-scene.css';
// Explore, rebuilt as a dining map. Same reasoning as hero-scene above and the
// same shape of answer: three new namespaces (`disc` / `atlas` / `rf`) instead
// of an override of `.explore*` / `.filters*` / `.map-preview`, whose rules are
// spread across index.css, editorial.css and polish.css. Nothing above matches
// these selectors, so this file is the only owner of the Explore surface — and
// the old rules retire on their own, because no element carries those classes
// any more. Loaded last, so the re-statement rule applies: section 13 is the
// only place a width-conditional rule lives.
import './explore-scene.css';
// The component layer's own stylesheet: the paint for the reusable
// primitives in `src/components/ui/`. Loaded last on purpose. A primitive
// is the system answer for a control, so it should not lose a tie to a
// page-era file that happens to sit lower in this list — and a page that
// genuinely needs to differ now has to say so in its own namespace, which
// makes the exception visible instead of accidental.
import './primitives.css';
// The restaurant photo deck: the MorphSlider component's own paint plus the
// `photo-morph` frame around it on /restaurant/:slug. A flat file here, rather
// than the `import './MorphSlider.css'` the component ships with, so this list
// stays the one place the cascade order is declared — a component-level import
// enters the cascade wherever the module graph puts it, which is an ordering
// bug nothing in tsc, oxlint or the build can see. Loaded last, and nothing
// above it matches `.morph-slider*` or `.photo-morph*`, so it restates no
// earlier media query. The two exceptions are deliberate: the photo-source and
// counter chips keep using `.detail__gallery-source` / `-count`, because their
// meaning did not change and neither should their appearance.
import './morph-slider.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Lucide draws on a 24px grid at stroke 2. Measured: every one of
        the 137 icons on the homepage rendered at stroke-width 2px while
        being displayed at 12-16px, where 2px is ~13% of the icon box —
        heavier than the 500/600 Manrope it sits beside, which is what
        made the icons read as louder than the text. 1.75 matches the
        UI weight. Context default only: any icon can still override it,
        and it costs zero bytes because the provider ships with the
        library. Mirrored in server-entry.tsx so the prerendered HTML
        carries the same attribute. */}
    <LucideProvider strokeWidth={1.75}>
      <BrowserRouter>
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
      </BrowserRouter>
    </LucideProvider>
  </StrictMode>,
);
