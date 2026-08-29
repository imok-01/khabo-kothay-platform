import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAuthUserId } from '../integrations/supabase/client';
import { insertRestaurantApplication } from '../integrations/supabase/queries';
import { developmentOtpAuth } from '../lib/developmentOtpAdapter';
import { Button, Field } from '../components/ui';

const isDevMock = import.meta.env.VITE_DEV_AUTH_MOCK === 'true';
import { usePageTitle } from '../lib/usePageTitle';

type FormState = {
  restaurant_name: string;
  area: string;
  address: string;
  cuisine: string;
  contact_details: string;
  website: string;
  notes: string;
};

const EMPTY: FormState = {
  restaurant_name: '',
  area: '',
  address: '',
  cuisine: '',
  contact_details: '',
  website: '',
  notes: '',
};

export default function RestaurantApplyPage() {
  usePageTitle('List your restaurant');
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const verifiedPhone = (location.state as { phone?: string } | null)?.phone ?? '';

  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Which required field the applicant left blank, rather than one sentence at
   * the bottom naming both. `required` on the inputs already catches an empty
   * field before the form submits, so this only ever fires on the case the
   * browser accepts and we do not: whitespace. A listing called " " is a
   * listing nobody can find.
   */
  const [blank, setBlank] = useState<{ name?: boolean; address?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);

  if (!session) {
    return <Navigate to="/login?intent=partner" replace />;
  }

  const update = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    // An error that survives the correction is an error that stops being read.
    if (key === 'restaurant_name') setBlank((b) => (b.name ? { ...b, name: undefined } : b));
    if (key === 'address') setBlank((b) => (b.address ? { ...b, address: undefined } : b));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const missing = {
      name: !form.restaurant_name.trim() || undefined,
      address: !form.address.trim() || undefined,
    };
    setBlank(missing);
    if (missing.name || missing.address) {
      setBusy(false);
      return;
    }

    let applicantUserId = await getAuthUserId();
    if (!applicantUserId && isDevMock && verifiedPhone) {
      // Defensive re-establishment: the real Supabase session is created during
      // OTP verification, but we close any hydration/persistence gap that could
      // leave `auth.uid()` unset by the time the user submits.
      await developmentOtpAuth.ensureSessionForPhone(verifiedPhone);
      applicantUserId = await getAuthUserId();
    }
    if (!applicantUserId) {
      setError('Your session expired. Please sign in again.');
      setBusy(false);
      return;
    }

    try {
      await insertRestaurantApplication({
        applicant_user_id: applicantUserId,
        applicant_phone: verifiedPhone || undefined,
        applicant_name: session?.name ?? '',
        applicant_role: session?.role ?? 'user',
        restaurant_name: form.restaurant_name.trim(),
        address: form.address.trim() || null,
        area: form.area.trim() || null,
        cuisine: form.cuisine.trim() || null,
        contact_details: form.contact_details.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your application did not reach us. Nothing was lost — send it once more.');
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <main className="section section--narrow">
        <div className="section__inner">
          <div className="auth-card">
            <div className="auth-card__head">
              <span className="section-heading__eyebrow">Application received</span>
              <h1>We have your application</h1>
              <p>
                Your claim on <strong>{form.restaurant_name}</strong> is with our editors, and a person
                reads every one. We'll come back to you on the number you signed in with. Once it clears,
                the listing is yours to run — menu, photos, offers and replies to your reviews.
              </p>
            </div>
            <Button variant="primary" block to="/" icon={ArrowLeft}>
              Back to home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <div className="auth-card">
          <div className="auth-card__head auth-card__head--form">
            <span className="section-heading__eyebrow">Partner with Khabo Kothay</span>
            <h1>List your restaurant</h1>
            <p>
              Tell us where to find you and what comes out of your kitchen. Every application is read by
              a person before a listing changes hands — that check is the reason diners trust what they
              read here.
            </p>
          </div>

          <form className="auth-card__form" onSubmit={submit}>
            {/* No asterisks. The convention primitives.css §6 ships is the
                inverse — a field says so when it is *optional*, so the two that
                matter are simply unmarked and the other five carry the quiet
                mark. An asterisk typed into a label is also read aloud: "Full
                address star". */}
            <Field
              label="Restaurant name"
              error={blank.name ? 'A name, not a space — this is what a diner searches for.' : undefined}
            >
              <input
                value={form.restaurant_name}
                onChange={update('restaurant_name')}
                required
                placeholder="The name above your door"
              />
            </Field>

            <Field label="Neighbourhood" optional>
              <input value={form.area} onChange={update('area')} placeholder="e.g. Gulshan 1" />
            </Field>

            <Field
              label="Full address"
              hint="Written the way you would give it to a delivery rider."
              error={blank.address ? 'An address, not a space — nobody can find a blank one.' : undefined}
            >
              <input
                value={form.address}
                onChange={update('address')}
                required
                placeholder="House and road, then the area"
              />
            </Field>

            <Field label="What you cook" optional>
              <input value={form.cuisine} onChange={update('cuisine')} placeholder="e.g. Bengali, Mughlai, Thai" />
            </Field>

            <Field label="Best way to reach you" optional>
              <input value={form.contact_details} onChange={update('contact_details')} placeholder={verifiedPhone || 'e.g. +8801XXXXXXXXX'} />
            </Field>

            <Field label="Website or social" optional>
              <input value={form.website} onChange={update('website')} placeholder="https://…" />
            </Field>

            <Field
              label="Tell us about the place"
              hint="What you are known for, how long you have been open — whatever you would want a diner to know first."
              optional
            >
              <textarea value={form.notes} onChange={update('notes')} rows={3} placeholder="A dish, a room, a year" />
            </Field>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            {/* `busy`, so the wait shows a spinner rather than relying on one
                word changing at the bottom of a long form. */}
            <Button type="submit" variant="primary" block busy={busy} icon={Send}>
              {busy ? 'Sending…' : 'Submit application'}
            </Button>
          </form>

          <p className="auth-card__foot">
            Already applied? We come back on the number you signed in with.{' '}
            <button type="button" className="linklike" onClick={() => navigate('/')}>Back to home</button>.
          </p>
        </div>
      </div>
    </main>
  );
}
