import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import Footer from './components/Footer';
import CompareTray from './components/CompareTray';
import ErrorBoundary from './components/ErrorBoundary';
import RequireRole from './components/RequireRole';
import { trackSessionStart } from './lib/analytics';
import { refreshOffers } from './repositories/OfferProvider';

const HomePage = lazy(() => import('./pages/HomePage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const GuidesDetailPage = lazy(() => import('./pages/GuidesDetailPage'));
const CuisinePage = lazy(() => import('./pages/CuisinePage'));
const AreaPage = lazy(() => import('./pages/AreaPage'));
const ForYouPage = lazy(() => import('./pages/ForYouPage'));
const RestaurantPage = lazy(() => import('./pages/RestaurantPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ExecutiveAdminPage = lazy(() => import('./pages/ExecutiveAdminPage'));
const RestaurantAdminPage = lazy(() => import('./pages/RestaurantAdminPage'));
const RestaurantApplyPage = lazy(() => import('./pages/RestaurantApplyPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const AboutPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.AboutPage })));
const HowItWorksPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.HowItWorksPage })));
const FaqPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.FaqPage })));
const TermsPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.PrivacyPage })));
const ContactPage = lazy(() => import('./pages/InfoPages').then((m) => ({ default: m.ContactPage })));
const PartnersLandingPage = lazy(() => import('./pages/PartnersPage').then((m) => ({ default: m.PartnersLandingPage })));
const PartnerListPage = lazy(() => import('./pages/PartnersPage').then((m) => ({ default: m.PartnerListPage })));
const PartnerUpdatePage = lazy(() => import('./pages/PartnersPage').then((m) => ({ default: m.PartnerUpdatePage })));
const PartnerHowPage = lazy(() => import('./pages/PartnersPage').then((m) => ({ default: m.PartnerHowPage })));
const PartnerEnquiryPage = lazy(() => import('./pages/PartnersPage').then((m) => ({ default: m.PartnerEnquiryPage })));
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminPlaceholderSection = lazy(() => import('./components/AdminLayout').then((m) => ({ default: m.AdminPlaceholderSection })));
const ExecutiveAdminSection = lazy(() => import('./pages/ExecutiveAdminPage').then((m) => ({ default: m.ExecutiveAdminSection })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Routes that own their whole viewport: the two consoles, which carry their own
 * sidebar navigation, and authentication, which is a full-height split stage.
 *
 * The consumer header, mobile bottom nav, footer and compare tray are all
 * suppressed on these. Two reasons beyond taste: a console with a consumer
 * header has two competing navigations, and the 62px mobile bottom bar sat on
 * top of console content with no way to scroll past it.
 */
function isFullScreenRoute(pathname: string) {
  return pathname === '/login' || pathname === '/manage' || pathname === '/admin' || pathname.startsWith('/admin/');
}

function RouteFallback() {
  return (
    <main className="page-loader" aria-busy="true" role="status">
      <span className="page-loader__spinner" aria-hidden="true" />
      <span className="sr-only">Loading page…</span>
    </main>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const fullScreen = isFullScreenRoute(pathname);

  useEffect(() => {
    trackSessionStart();
    refreshOffers();
  }, []);

  return (
    <div className={`app ${fullScreen ? 'app--console' : ''}`}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <ScrollToTop />
      {!fullScreen && <Navbar />}
      {!fullScreen && <MobileNav />}
      <div className="app__body" id="main-content" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/search" element={<ExplorePage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/guides" element={<GuidesPage />} />
              <Route path="/guides/:slug" element={<GuidesDetailPage />} />
              <Route path="/cuisine/:slug" element={<CuisinePage />} />
              <Route path="/area/:slug" element={<AreaPage />} />
              <Route path="/for-you" element={<ForYouPage />} />
              <Route path="/restaurant/:id" element={<RestaurantPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/restaurant/apply" element={<RestaurantApplyPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {/* KK admin console. Every section below is a working tool that
                  used to be hidden behind a tab strip on /admin; the sidebar is
                  now the only navigation. /admin/verification, /admin/data and
                  /admin/reports are kept as URLs so existing links resolve —
                  the first two now reach the real queues and the third redirects
                  to where flags actually live. */}
              <Route element={<RequireRole roles={['executive']}><AdminLayout /></RequireRole>}>
                <Route path="/admin" element={<ExecutiveAdminPage />} />
                <Route path="/admin/applications" element={<ExecutiveAdminSection section="applications" />} />
                <Route path="/admin/verification" element={<ExecutiveAdminSection section="menus" />} />
                <Route path="/admin/data" element={<ExecutiveAdminSection section="intelligence" />} />
                <Route path="/admin/offers" element={<ExecutiveAdminSection section="offers" />} />
                <Route path="/admin/reviews" element={<ExecutiveAdminSection section="reviews" />} />
                <Route path="/admin/restaurants" element={<ExecutiveAdminSection section="restaurants" />} />
                <Route path="/admin/prices" element={<ExecutiveAdminSection section="prices" />} />
                <Route path="/admin/users" element={<ExecutiveAdminSection section="users" />} />
                <Route path="/admin/reports" element={<Navigate to="/admin/reviews" replace />} />
                <Route path="/admin/settings" element={<AdminPlaceholderSection section="settings" />} />
              </Route>
              <Route
                path="/manage"
                element={
                  <RequireRole roles={['restaurant_admin']}>
                    <RestaurantAdminPage />
                  </RequireRole>
                }
              />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/faq" element={<FaqPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/partners" element={<PartnersLandingPage />} />
              <Route path="/partners/list-your-restaurant" element={<PartnerListPage />} />
              <Route path="/partners/update-information" element={<PartnerUpdatePage />} />
              <Route path="/partners/how-listings-work" element={<PartnerHowPage />} />
              <Route path="/partners/enquiry" element={<PartnerEnquiryPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      {!fullScreen && <Footer />}
      {!fullScreen && <CompareTray />}
    </div>
  );
}
