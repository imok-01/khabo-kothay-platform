import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthUserId } from '../integrations/supabase/client';
import { insertRestaurantApplication } from '../integrations/supabase/queries';
import { developmentOtpAuth } from '../lib/developmentOtpAdapter';

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
  const [submitted, setSubmitted] = useState(false);

  if (!session) {
    return <Navigate to="/login?intent=partner" replace />;
  }

  const update = (key: keyof FormState) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!form.restaurant_name.trim() || !form.address.trim()) {
      setError('Restaurant name and address are required.');
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
      setError(err instanceof Error ? err.message : 'Could not submit your application. Please try again.');
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
              <h1>Thank you — we'll be in touch</h1>
              <p>
                Your application to list <strong>{form.restaurant_name}</strong> has been submitted to Khabo
                Kothay. Our team reviews every submission. If approved, you'll gain access to manage your
                restaurant's listing.
              </p>
            </div>
            <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/')}>
              Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <div className="auth-card">
          <div className="auth-card__head">
            <span className="section-heading__eyebrow">Partner with Khabo Kothay</span>
            <h1>List your restaurant</h1>
            <p>
              Tell us about your restaurant. A Khabo Kothay executive reviews every application before
              ownership access is activated — this keeps the platform trustworthy for diners.
            </p>
          </div>

          <form className="auth-card__form" onSubmit={submit}>
            <label className="field">
              <span className="field__label">Restaurant name *</span>
              <input value={form.restaurant_name} onChange={update('restaurant_name')} required placeholder="e.g. The Bengal Kitchen" />
            </label>

            <label className="field">
              <span className="field__label">Area / neighbourhood</span>
              <input value={form.area} onChange={update('area')} placeholder="e.g. Gulshan 1" />
            </label>

            <label className="field">
              <span className="field__label">Full address *</span>
              <input value={form.address} onChange={update('address')} required placeholder="Street, building, city" />
            </label>

            <label className="field">
              <span className="field__label">Cuisine type</span>
              <input value={form.cuisine} onChange={update('cuisine')} placeholder="e.g. Bengali, North Indian" />
            </label>

            <label className="field">
              <span className="field__label">Contact phone or email</span>
              <input value={form.contact_details} onChange={update('contact_details')} placeholder={verifiedPhone || 'e.g. +8801XXXXXXXXX'} />
            </label>

            <label className="field">
              <span className="field__label">Website / social (optional)</span>
              <input value={form.website} onChange={update('website')} placeholder="https://…" />
            </label>

            <label className="field">
              <span className="field__label">Why do you want to list with us? (optional)</span>
              <textarea value={form.notes} onChange={update('notes')} rows={3} placeholder="A short note about your restaurant" />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit application'}
            </button>
          </form>

          <p className="auth-card__foot">
            Already submitted? <button type="button" className="linklike" onClick={() => navigate('/')}>Back to home</button>.
          </p>
        </div>
      </div>
    </main>
  );
}
