import { Link } from 'react-router-dom';
import { Soup, UtensilsCrossed, Bookmark, Heart, Info, Compass, HelpCircle, Mail, FileText, ShieldCheck, Store, PenLine, BookOpen, AtSign, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleViewOf } from '../domain/auth';

/**
 * Footer — premium product footer.
 *
 * Columns follow the site's real destinations; nothing links to a page that
 * doesn't exist. Signed-in restaurant owners are pointed at their management
 * edit system (/manage) instead of the public correction flow; everyone else
 * gets the public partner pages.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  const { session } = useAuth();
  const isOwner = roleViewOf(session?.role) === 'restaurant_owner';
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__logo" aria-hidden="true"><Soup size={20} /></span>
          <div>
            <strong className="footer__mark">Khabo <em>Kothay</em></strong>
            <p className="footer__tagline">Discover Dhaka's restaurants with confidence.</p>
            <p className="footer__statement">
              Real listings, honest data, and recommendations that explain themselves — built for the daily question: where do we eat today?
            </p>
          </div>
        </div>
        <div className="footer__col">
          <h4>Discover</h4>
          <Link to="/discover"><Compass size={14} aria-hidden="true" /> Discover hub</Link>
          <Link to="/explore"><UtensilsCrossed size={14} aria-hidden="true" /> Search restaurants</Link>
          <Link to="/guides"><BookOpen size={14} aria-hidden="true" /> Guides</Link>
          <Link to="/saved"><Bookmark size={14} aria-hidden="true" /> Saved</Link>
          <Link to="/favorites"><Heart size={14} aria-hidden="true" /> Favourites</Link>
        </div>
        <div className="footer__col">
          <h4>Company</h4>
          <Link to="/about"><Info size={14} aria-hidden="true" /> About</Link>
          <Link to="/how-it-works"><Compass size={14} aria-hidden="true" /> How it works</Link>
          <Link to="/faq"><HelpCircle size={14} aria-hidden="true" /> FAQ</Link>
          <Link to="/contact"><Mail size={14} aria-hidden="true" /> Contact &amp; feedback</Link>
        </div>
        <div className="footer__col">
          <h4>Restaurant partners</h4>
          {isOwner ? (
            <>
              <Link to="/manage?tab=profile"><PenLine size={14} aria-hidden="true" /> Update information</Link>
              <Link to="/partners/how-listings-work"><BookOpen size={14} aria-hidden="true" /> How listings work</Link>
            </>
          ) : (
            <>
              <Link to="/partners"><Store size={14} aria-hidden="true" /> Partner with Khabo Kothay</Link>
              <Link to="/partners/list-your-restaurant"><Store size={14} aria-hidden="true" /> List your restaurant</Link>
              <Link to="/partners/update-information"><PenLine size={14} aria-hidden="true" /> Update information</Link>
              <Link to="/partners/how-listings-work"><BookOpen size={14} aria-hidden="true" /> How listings work</Link>
            </>
          )}
        </div>
      </div>
      <div className="footer__bottom">
        <div className="footer__bottom-inner">
          <p>© {year} Khabo Kothay · Made with ♥ in Dhaka</p>
          <div className="footer__social" aria-label="Social channels — coming soon">
            <span className="footer__social-icon" title="Coming soon"><AtSign size={16} aria-hidden="true" /></span>
            <span className="footer__social-icon" title="Coming soon"><Share2 size={16} aria-hidden="true" /></span>
          </div>
          <div className="footer__legal">
            <Link to="/privacy"><ShieldCheck size={14} aria-hidden="true" /> Privacy</Link>
            <Link to="/terms"><FileText size={14} aria-hidden="true" /> Terms</Link>
          </div>
          <p className="footer__note">Saved places are stored on your device.</p>
        </div>
      </div>
    </footer>
  );
}
