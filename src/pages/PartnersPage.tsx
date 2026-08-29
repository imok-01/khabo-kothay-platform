import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Store, PenLine, BookOpen, ArrowRight, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { usePageTitle } from '../lib/usePageTitle';
import { useAuth } from '../context/AuthContext';
import { roleViewOf } from '../domain/auth';
import { Button, Field } from '../components/ui';

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

/**
 * The block at the foot of a partner page that turns reading into doing.
 *
 * It used to hard-code "Talk to the Khabo Kothay team / Send us your details
 * through the contact page" while one of its two callers pointed the button at
 * the sign-in step for an application — so the heading described a conversation
 * that was not on offer and named a contact page the button did not open. The
 * words come from the call site now, because the call site is the only place
 * that knows where the button goes.
 */
function ContactCta({
  title,
  body,
  label,
  to = '/contact',
}: {
  title: string;
  body: string;
  label: string;
  to?: string;
}) {
  return (
    <div className="partner-cta">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      {/* `iconAfter` owns the trailing arrow now. This markup wrote
          `className="btn__after"` by hand — the travel contract copied out of
          the stylesheet at four call sites, which is exactly the kind of
          decision the primitive exists to hold once. */}
      <Button variant="primary" to={to} iconAfter={ArrowRight}>{label}</Button>
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
            <Button variant="primary" to="/manage?tab=profile" iconAfter={ArrowRight}>
              Go to your restaurant dashboard
            </Button>
          </div>
        ) : (
          <ContactCta
            title="Ready to be found?"
            body="Sign in with your phone, then tell us about the place. An editor reads every application."
            label="Start your application"
            to="/login?intent=partner"
          />
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
            <Button variant="primary" to="/manage?tab=profile" iconAfter={ArrowRight}>
              Go to your restaurant dashboard
            </Button>
          </div>
        ) : (
          <ContactCta
            title="Tell us what to fix"
            body="Send the correction and what it should say. We check it — with the restaurant where we can — before the public page changes."
            label="Submit correction request"
            to="/partners/enquiry?type=update"
          />
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
            {/* A two-item list of reassurances stood here — each line marked with
                both `.info-list`'s ring bullet *and* an inline-styled green
                check, and each line restating what the paragraph above it had
                just said ("nothing changes without review", for the third time
                on this page family). Repetition is what makes a promise stop
                sounding like one. */}
          </section>
        </div>
        <div className="partner-cta">
          <div>
            <h2>Need to update your restaurant information?</h2>
            <p>Send a correction request and we’ll review it before updating the public listing.</p>
          </div>
          <Button variant="primary" to="/partners/update-information" iconAfter={ArrowRight}>
            Update information
          </Button>
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
              <h2>Nothing was sent — and we would rather say so</h2>
              {/* The old wording was "your details are ready" over "submissions
                  are kept on your device until the account system is live".
                  Neither is true: this handler sets a flag and nothing else, so
                  there is no draft on the device and nothing queued anywhere.
                  A page built on labelled provenance cannot afford to invent a
                  save, least of all to a restaurant owner who then waits. */}
              <p>
                This form is a placeholder while the partner enquiry route is wired to our account
                system, so what you typed has not been stored or sent. If your {isUpdate ? 'correction' : 'restaurant'} is
                urgent, the fastest path today is an owner account — sign in with your phone and apply
                from there, and a person will read it.
              </p>
              {/* A leading arrow, because this one goes back. */}
              <Button variant="ghost" to={isUpdate ? '/partners/update-information' : '/partners/list-your-restaurant'} icon={ArrowLeft}>
                Back to the process page
              </Button>
            </section>
          </div>
        ) : (
          <form className="auth-card" onSubmit={onSubmit}>
            <div className="auth-card__head auth-card__head--form">
              <h2>Enquiry details</h2>
              <p>
                {isUpdate
                  ? 'Include the restaurant name and what changed, so we know where to look.'
                  : 'Include as much as you can — nothing is published until it is checked.'}
              </p>
            </div>
            <Field label="Your name">
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="e.g. Priya Sen" />
            </Field>
            <Field label="Phone or email" hint="Whichever you would rather we replied to.">
              <input value={contact} onChange={(e) => setContact(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Field label="Which restaurant">
              <input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} required placeholder="As it appears on the door" />
            </Field>
            <Field label={isUpdate ? 'What changed?' : 'Tell us about the place'}>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required placeholder={isUpdate ? 'e.g. Opening hours changed to 11am–11pm from this week.' : 'e.g. Cuisines, signature dishes, price range, opening hours.'} />
            </Field>
            <Button type="submit" variant="primary" block icon={Send}>
              {isUpdate ? 'Submit correction request' : 'Submit restaurant details'}
            </Button>
            <p className="auth-card__demo-note">
              Placeholder form — not yet connected to a backend. Nothing you type here is stored or
              sent, and the next screen says so too.
            </p>
          </form>
        )}
      </div>
    </main>
  );
};
