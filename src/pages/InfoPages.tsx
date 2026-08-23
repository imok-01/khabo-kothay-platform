import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Flag, MessagesSquare, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '../lib/usePageTitle';

interface InfoSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

interface InfoPageDef {
  eyebrow: string;
  title: string;
  lede?: string;
  sections: InfoSection[];
}

function InfoPage({ page }: { page: InfoPageDef }) {
  usePageTitle(page.title);
  return (
    <main className="section section--info">
      <div className="section__inner">
        <header className="info-hero">
          <span className="section-heading__eyebrow">{page.eyebrow}</span>
          <h1>{page.title}</h1>
          {page.lede && <p className="info-hero__lede">{page.lede}</p>}
        </header>
        <div className="info-body">
          {page.sections.map((s) => (
            <section key={s.heading} className="info-card">
              <h2>{s.heading}</h2>
              {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
              {s.list && (
                <ul className="info-list">
                  {s.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ — accordion (same content, interactive presentation)            */
/* ------------------------------------------------------------------ */

interface FaqEntry {
  q: string;
  a: string[];
}

function FaqItem({ entry }: { entry: FaqEntry }) {
  const [open, setOpen] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  // Answer content is static, so measure it once on mount and animate the
  // wrapper height between 0 and the measured value (works in every browser;
  // grid-track interpolation is not supported everywhere).
  const [contentHeight, setContentHeight] = useState(0);
  useEffect(() => {
    if (innerRef.current) setContentHeight(innerRef.current.scrollHeight);
  }, []);
  return (
    <div className={`faq-item ${open ? 'faq-item--open' : ''}`}>
      <button
        type="button"
        className="faq-item__q"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{entry.q}</span>
        <ChevronDown size={18} className="faq-item__chevron" aria-hidden="true" />
      </button>
      <div
        className="faq-item__a"
        style={{ height: open ? contentHeight : 0 }}
        aria-hidden={!open}
      >
        <div className="faq-item__a-inner" ref={innerRef}>
          {entry.a.map((p) => <p key={p}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    q: 'Is Khabo Kothay free to use?',
     a: ['Yes. Browsing, searching, saving places and getting recommendations are all free.'],
  },
  {
    q: 'How are recommendations calculated?',
    a: [
      'Each restaurant is scored against what you asked for and, when you\u2019re signed in, your profile and favourites. The score is a match signal, not a quality rating — and it always shows its reasoning, so nothing is a black box.',
    ],
  },
  {
    q: 'Where does restaurant data come from?',
    a: [
      'Public Google data where available — ratings, review counts, hours and photos — is clearly labelled as Google data. Our own records cover the rest and are verified over time; unverified details are shown as unverified.',
    ],
  },
  {
    q: 'How fresh is the data?',
    a: [
      'We refresh Google-sourced information on a controlled basis rather than pretending it\u2019s real-time. Hours and availability change — check with the restaurant for time-sensitive plans.',
    ],
  },
  {
    q: 'I run a restaurant in Dhaka. How can I get listed?',
    a: [
      'We\u2019re working on self-serve tools for restaurant owners to manage their listings. Until then, use the Contact page to send us your details and we\u2019ll note them for review.',
    ],
  },
];

export const FaqPage = () => {
  usePageTitle('Frequently asked questions');
  return (
    <main className="section section--info">
      <div className="section__inner">
        <header className="info-hero">
          <span className="section-heading__eyebrow">FAQ</span>
          <h1>Frequently asked questions</h1>
          <p className="info-hero__lede">A few quick answers about how Khabo Kothay BD works.</p>
        </header>
        <div className="faq-list">
          {FAQ_ENTRIES.map((entry) => (
            <FaqItem key={entry.q} entry={entry} />
          ))}
        </div>
      </div>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* Contact — category cards + restaurant-partner banner                */
/* ------------------------------------------------------------------ */

export const ContactPage = () => {
  usePageTitle('Contact & feedback');
  return (
    <main className="section section--info">
      <div className="section__inner">
        <header className="info-hero">
          <span className="section-heading__eyebrow">Contact</span>
          <h1>Contact &amp; feedback</h1>
          <p className="info-hero__lede">
            We’d genuinely like to hear from you — feedback is how the guide gets better.
          </p>
        </header>
        <div className="contact-grid">
          <article className="contact-card">
            <span className="contact-card__icon" aria-hidden="true"><Flag size={18} /></span>
            <h2>Feedback on a listing</h2>
            <p>
              Spot something wrong — a moved restaurant, a wrong hour, a missing detail? Tell us what
              you saw and where, and we’ll review and correct it.
            </p>
          </article>
          <article className="contact-card">
            <span className="contact-card__icon" aria-hidden="true"><AlertTriangle size={18} /></span>
            <h2>Report incorrect information</h2>
            <p>
              Wrong address, outdated hours, a menu that no longer matches? Tell us what you saw and
              where — we’ll review and correct it.
            </p>
          </article>
          <article className="contact-card">
            <span className="contact-card__icon" aria-hidden="true"><MessagesSquare size={18} /></span>
            <h2>General questions</h2>
            <p>
              For anything else — suggestions, bugs — send us a note through the feedback channel in
              your profile. We read everything, even if we can’t reply to every message.
            </p>
          </article>
        </div>
        <p className="contact-partner-note">
          Running a restaurant in Dhaka? Visit{' '}
          <Link to="/partners">Restaurant partners</Link> for listing and update help.
        </p>
      </div>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* Static pages (shared layout)                                        */
/* ------------------------------------------------------------------ */

export const AboutPage = () => (
  <InfoPage
    page={{
      eyebrow: 'About',
      title: 'About Khabo Kothay BD',
      lede: 'Khabo Kothay BD is a restaurant discovery guide for Dhaka — built to help you answer the daily question: where do we eat today?',
      sections: [
        {
          heading: 'What we do',
          paragraphs: [
            'We organise real restaurants across Dhaka\u2019s neighbourhoods — from Gulshan to Banani and beyond — so you can browse by area, cuisine, budget and occasion instead of scrolling through scattered listings.',
            'Every listing carries the details that matter when choosing: location, cuisine, price range, opening hours and ratings, with the source of that information kept visible.',
          ],
        },
        {
          heading: 'How we stay honest',
          list: [
            'Ratings and review counts come from Google where available — labelled as Google data, never mixed with our own.',
            'Menu and detail information is recorded and verified over time; anything we haven\u2019t confirmed yet is shown as unverified rather than guessed.',
            'Recommendations always explain themselves — every match shows the reasons behind the score.',
          ],
        },
        {
          heading: 'Where we\u2019re headed',
          paragraphs: [
            'We\u2019re steadily expanding coverage and adding richer menu and detail data. If a listing is incomplete today, it\u2019s because we\u2019re still recording it — not because we\u2019re making things up.',
          ],
        },
      ],
    }}
  />
);

export const HowItWorksPage = () => (
  <InfoPage
    page={{
      eyebrow: 'How it works',
      title: 'How Khabo Kothay works',
      lede: 'Finding somewhere to eat takes seconds — no endless scrolling through directories.',
      sections: [
        {
          heading: '1. Tell us what you\u2019re craving',
          paragraphs: [
            'Start from the homepage or Explore: pick a neighbourhood, cuisine, budget and when you want to eat. You can also type a natural phrase like "date night near Gulshan" and we\u2019ll work out what you mean.',
          ],
        },
        {
          heading: '2. We rank the best matches',
          paragraphs: [
            'Every restaurant gets a match percentage based on your choices and, when you\u2019re signed in, your saved preferences and saved places. Every score comes with reasons — tap the info icon to see exactly why a place matched.',
          ],
        },
        {
          heading: '3. Pick, save and share',
          list: [
             'Save places to build your shortlist.',
            'Compare restaurants side by side.',
            'Get directions or check the map.',
            'Share a restaurant with friends.',
          ],
        },
        {
          heading: 'Where the data comes from',
          paragraphs: [
            'Public Google data (ratings, hours, photos) is shown as Google data. Our own records cover menus, details and editorial notes, and are verified over time. For time-sensitive plans — a long journey or a special occasion — it\u2019s always worth confirming with the restaurant directly.',
          ],
        },
        {
          heading: 'For restaurant owners',
          paragraphs: [
            'Listings are created from public sources and our own records, then verified over time — nothing goes live as fact until it has been checked.',
            'If you run a restaurant in Dhaka, you can request updates to your listing — hours, address, menus, photos — through the Contact page. We review every request before publishing changes.',
          ],
        },
      ],
    }}
  />
);

export const TermsPage = () => (
  <InfoPage
    page={{
      eyebrow: 'Terms',
      title: 'Terms of use',
      lede: 'Simple, general terms for using the Khabo Kothay BD website.',
      sections: [
        {
          heading: 'The service',
          paragraphs: [
            'Khabo Kothay BD helps people discover restaurants in Dhaka. The website and its features are provided for personal, non-commercial use.',
          ],
        },
        {
          heading: 'Information on this site',
          paragraphs: [
            'Restaurant information is assembled from public sources and our own records, and may be incomplete or out of date. We do our best to keep things accurate but make no guarantee that every listing, price, hour or review count is current. Always confirm important details with the restaurant.',
          ],
        },
        {
          heading: 'Your use of the site',
          list: [
            'Use the site lawfully and don\u2019t attempt to disrupt or misuse it.',
            'Don\u2019t scrape or copy the restaurant database in bulk without permission.',
            'You\u2019re responsible for anything you post or share through the site.',
          ],
        },
        {
          heading: 'Changes',
          paragraphs: [
            'We may update these terms from time to time. Continued use of the site after changes means you accept the updated terms.',
          ],
        },
      ],
    }}
  />
);

export const PrivacyPage = () => (
  <InfoPage
    page={{
      eyebrow: 'Privacy',
      title: 'Privacy',
      lede: 'A straightforward summary of what data the site uses and how it\u2019s handled.',
      sections: [
        {
          heading: 'What we store',
          list: [
             'Saved places, recently viewed and your preferences are stored locally in your browser.',
            'Demo sign-in keeps your session and profile data in your browser too — no external account server is involved in the current demo build.',
            'Location is only used when you explicitly allow it, and only to sort by distance.',
          ],
        },
        {
          heading: 'What we don\u2019t do',
          paragraphs: [
            'We don\u2019t sell personal data. We don\u2019t build profiles of visitors for advertising. Google Maps and fonts load from Google\u2019s services under their own privacy terms when they\u2019re used on a page.',
          ],
        },
        {
          heading: 'Third-party services',
          paragraphs: [
            'The site uses Google Maps for maps and directions, and Google data for some restaurant information. Those services process data under Google\u2019s policies.',
          ],
        },
      ],
    }}
  />
);
