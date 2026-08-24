import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Store, PenLine, BookOpen, ArrowRight, Check, Send, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { roleViewOf } from '../domain/auth';

interface PartnerHeroProps {
  eyebrow: string;
  title: string;
  lede: string;
}

function PartnerHero({ eyebrow, title, lede }: PartnerHeroProps) {
  return (
    <header className="info-hero">
      <span className="section-heading__eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p className="info-hero__lede">{lede}</p>
    </header>
  );
}

function ContactCta({ label, to = '/contact' }: { label: string; to?: string }) {
  return (
    <div className="partner-cta">
      <div>
        <h2>Talk to the Khabo Kothay team</h2>
        <p>Send us your details through the contact page and we’ll review and respond.</p>
      </div>
      <Link to={to} className="btn btn--primary">
        {label} <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* /partners — landing                                                 */
/* ------------------------------------------------------------------ */

export const PartnersLandingPage = () => {
  usePageTitle('Partner with Khabo Kothay');
  return (
    <main className="section section--info">
      <div className="section__inner">
        <PartnerHero
          eyebrow="Restaurant partners"
          title="Partner with Khabo Kothay"
          lede="Khabo Kothay helps Dhaka diners discover restaurants. If you run one, here’s how to get listed, keep your information right, and understand how listings work."
        />
        <div className="info-body">
          <section className="info-card">
            <h2>Why restaurants join</h2>
            <p>
              A Khabo Kothay listing puts your restaurant in front of people actively deciding where
              to eat in Dhaka. Diners find you through Explore, search and recommendations — with
              the details that matter kept visible and honest.
            </p>
          </section>
          <section className="info-card">
            <h2>What information we collect</h2>
            <ul className="info-list">
              <li>Public details like ratings, hours and photos — labelled with their source.</li>
              <li>Your venue’s own information: cuisines, price range, description.</li>
              <li>Menu and detail data, recorded and verified over time.</li>
            </ul>
          </section>
          <section className="info-card">
            <h2>How verification works</h2>
            <p>
              Everything on a listing carries its source. Public data is shown as Google data,
              our records are verified over time, and anything we haven’t confirmed is shown as
              unverified rather than guessed. Nothing is published without review.
            </p>
          </section>
        </div>
        <div className="contact-grid">
          <article className="contact-card">
            <span className="contact-card__icon" aria-hidden="true"><Store size={18} /></span>
            <h2>List your restaurant</h2>
            <p>Add your venue to the guide so diners can find it, read about it, and decide to visit.</p>
            <Link to="/partners/list-your-restaurant" className="partner-card__link">
              Get listed <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </article>
          <article className="contact-card">
            <span className="contact-card__icon" aria-hidden="true"><PenLine size={18} /></span>
            <h2>Update information</h2>
            <p>Hours, address, menus, photos — keep what diners see accurate and current.</p>
            <Link to="/partners/update-information" className="partner-card__link">
              Request a change <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </article>
          <article className="contact-card">
            <span className="contact-card__icon" aria-hidden="true"><BookOpen size={18} /></span>
            <h2>How listings work</h2>
            <p>Understand how information is collected, verified, and kept honest before it’s published.</p>
            <Link to="/partners/how-listings-work" className="partner-card__link">
              Learn more <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </div>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* /partners/list-your-restaurant                                      */
/* ------------------------------------------------------------------ */

export const PartnerListPage = () => {
  usePageTitle('List your restaurant · Khabo Kothay');
  const { session } = useAuth();
  const isOwner = roleViewOf(session?.role) === 'restaurant_owner';
  return (
    <main className="section section--info">
      <div className="section__inner">
        <PartnerHero
          eyebrow="Restaurant partners"
          title="List your restaurant"
          lede="Get your restaurant in front of people looking for somewhere to eat in Dhaka."
        />
        <div className="info-body">
          <section className="info-card">
            <h2>What listing means</h2>
            <p>
              A listing is your venue’s page on Khabo Kothay — name, neighbourhood, address, cuisines,
              hours, price range, photos and, over time, menu details. Diners find it through Explore,
              search and recommendations.
            </p>
          </section>
          <section className="info-card">
            <h2>How to get listed</h2>
            <ul className="info-list">
              <li>Create a Khabo Kothay account and open the restaurant application form.</li>
              <li>Send us your restaurant name, address and contact details.</li>
              <li>Tell us what you serve — cuisines, signature dishes, price range.</li>
              <li>We review the application before ownership access is activated.</li>
              <li>Once approved, you can manage your listing from your restaurant dashboard.</li>
            </ul>
          </section>
        </div>
        {isOwner ? (
          <div className="partner-cta">
            <div>
              <h2>You already manage a restaurant on Khabo Kothay</h2>
              <p>Use your restaurant dashboard to update your listing.</p>
            </div>
            <Link to="/manage?tab=profile" className="btn btn--primary">
              Go to your restaurant dashboard <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ContactCta label="Start your application" to="/login?intent=partner" />
        )}
      </div>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* /partners/update-information                                        */
/* ------------------------------------------------------------------ */

export const PartnerUpdatePage = () => {
  usePageTitle('Update restaurant information · Khabo Kothay');
  const { session } = useAuth();
  const isOwner = roleViewOf(session?.role) === 'restaurant_owner';
  return (
    <main className="section section--info">
      <div className="section__inner">
        <PartnerHero
          eyebrow="Restaurant partners"
          title="Update information"
          lede="Found something on your listing that’s out of date? Request a correction and we’ll review it."
        />
        <div className="info-body">
          <section className="info-card">
            <h2>What you can update</h2>
            <ul className="info-list">
              <li>Opening hours and holiday closures.</li>
              <li>Address, phone number and directions.</li>
              <li>Menus, dishes and prices.</li>
              <li>Photos, cuisines and description.</li>
            </ul>
          </section>
          <section className="info-card">
            <h2>How it works</h2>
            <p>
              Send a correction request with what changed. We verify it — including against the
              restaurant itself when possible — before updating the public listing. Nothing is
              published without review.
            </p>
          </section>
        </div>
        {isOwner ? (
          <div className="partner-cta">
            <div>
              <h2>You manage a restaurant on Khabo Kothay</h2>
              <p>
                Use your restaurant dashboard to update the listing — changes become a draft and go
                live only after executive review.
              </p>
            </div>
            <Link to="/manage?tab=profile" className="btn btn--primary">
              Go to your restaurant dashboard <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ContactCta label="Submit correction request" to="/partners/enquiry?type=update" />
        )}
      </div>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* /partners/how-listings-work — educational only                      */
/* ------------------------------------------------------------------ */

export const PartnerHowPage = () => {
  usePageTitle('How listings work · Khabo Kothay');
  return (
    <main className="section section--info">
      <div className="section__inner">
        <PartnerHero
          eyebrow="Restaurant partners"
          title="How listings work"
          lede="A clear picture of how information gets onto Khabo Kothay — and how it stays honest."
        />
        <div className="info-body">
          <section className="info-card">
            <h2>How listings are created</h2>
            <p>
              Listings start from public sources — like Google data on ratings, hours and photos —
              combined with our own records and details provided by restaurants. Every piece of
              information carries its source so diners can judge it.
            </p>
          </section>
          <section className="info-card">
            <h2>How information is verified</h2>
            <ul className="info-list">
              <li>Public data is labelled with its source and never presented as our own.</li>
              <li>Menu and detail data is recorded and checked over time.</li>
              <li>Unverified details are shown as unverified — we don’t guess.</li>
              <li>Restaurant-provided updates are reviewed before going live.</li>
            </ul>
          </section>
          <section className="info-card">
            <h2>How restaurants can request updates</h2>
            <p>
              Use the <Link to="/partners/update-information">update information</Link> page to send a
              correction request. We review every request and keep the source of any change visible.
            </p>
            <ul className="info-list" style={{ marginTop: 'var(--s3)' }}>
              <li><Check size={14} style={{ color: 'var(--success)', verticalAlign: '-2px', marginRight: 6 }} aria-hidden="true" /> Timely corrections improve trust for everyone.</li>
              <li><Check size={14} style={{ color: 'var(--success)', verticalAlign: '-2px', marginRight: 6 }} aria-hidden="true" /> Nothing changes without review.</li>
            </ul>
          </section>
        </div>
        <div className="partner-cta">
          <div>
            <h2>Need to update your restaurant information?</h2>
            <p>Send a correction request and we’ll review it before updating the public listing.</p>
          </div>
          <Link to="/partners/update-information" className="btn btn--primary">
            Update information <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* /partners/enquiry — placeholder enquiry form.                       */
/* Prepares the submission flow for the backend; nothing is sent       */
/* anywhere yet, and the page says so honestly.                        */
/* ------------------------------------------------------------------ */

export const PartnerEnquiryPage = () => {
  const [params] = useSearchParams();
  const type = params.get('type');
  const isUpdate = type === 'update';
  usePageTitle(isUpdate ? 'Submit correction request' : 'Submit restaurant details');

  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [message, setMessage] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <header className="info-hero">
          <span className="section-heading__eyebrow">Restaurant partners</span>
          <h1>{isUpdate ? 'Submit correction request' : 'Submit restaurant details'}</h1>
          <p className="info-hero__lede">
            {isUpdate
              ? 'Tell us what changed — wrong hours, a new address, an outdated menu — and we’ll review and correct it.'
              : 'Send your restaurant details and our team will review them before anything goes live.'}
          </p>
        </header>

        {submitted ? (
          <div className="info-body">
            <section className="info-card">
              <span className="info-card__icon" aria-hidden="true"><CheckCircle2 size={18} /></span>
              <h2>Thanks — your {isUpdate ? 'correction request' : 'restaurant details'} are ready</h2>
              <p>
                This enquiry flow is prepared for the Khabo Kothay team and will be connected to
                our account system as part of the database integration. Nothing is sent anywhere yet.
              </p>
              <Link to={isUpdate ? '/partners/update-information' : '/partners/list-your-restaurant'} className="btn btn--ghost" style={{ marginTop: 'var(--s3)' }}>
                Back to the process page
              </Link>
            </section>
          </div>
        ) : (
          <form className="auth-card" onSubmit={onSubmit}>
            <div className="auth-card__head" style={{ paddingBottom: 'var(--s4)' }}>
              <h2>Enquiry details</h2>
              <p>
                {isUpdate
                  ? 'Include the restaurant name and what changed so we can route it correctly.'
                  : 'Include as much as you can — we’ll verify before publishing anything.'}
              </p>
            </div>
            <label className="field">
              <span className="field__label">Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="e.g. Priya Sen" />
            </label>
            <label className="field">
              <span className="field__label">Phone or email</span>
              <input value={contact} onChange={(e) => setContact(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="field">
              <span className="field__label">Restaurant</span>
              <input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required placeholder="Your restaurant name" />
            </label>
            <label className="field">
              <span className="field__label">{isUpdate ? 'What changed?' : 'Tell us about your restaurant'}</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required placeholder={isUpdate ? 'e.g. Opening hours changed to 11am–11pm from this week.' : 'e.g. Cuisines, signature dishes, price range, opening hours.'} />
            </label>
            <button type="submit" className="btn btn--primary btn--block">
              <Send size={15} aria-hidden="true" /> {isUpdate ? 'Submit correction request' : 'Submit restaurant details'}
            </button>
            <p className="auth-card__demo-note" style={{ marginTop: 'var(--s3)' }}>
              Demo placeholder — this form isn’t connected to a backend yet. Submissions are kept on
              your device until the account system is live.
            </p>
          </form>
        )}
      </div>
    </main>
  );
};
