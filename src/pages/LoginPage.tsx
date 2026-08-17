import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldCheck, UtensilsCrossed, Store, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { DEMO_ACCOUNT_CREDENTIALS, DEMO_PASSWORD } from '../data/demoAccounts';

export default function LoginPage() {
  usePageTitle('Sign in');
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'user' | 'restaurant_admin'>('user');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const fillDemo = (c: string) => {
    setMode('login');
    setContact(c);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === 'login'
        ? await login(contact, password)
        : await signup(name, contact, password, role);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Something went wrong.');
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <div className="auth-card">
          <div className="auth-card__head">
            <span className="section-heading__eyebrow">Khabo Kothay account</span>
            <h1>{mode === 'login' ? 'Welcome back' : 'Join the food club'}</h1>
            <p>
              Browsing stays free — sign in to unlock reviews, rewards, referrals and personalisation.
            </p>
          </div>

          <div className="auth-card__tabs" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-card__tab ${mode === 'login' ? 'auth-card__tab--active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              <LogIn size={15} aria-hidden="true" /> Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-card__tab ${mode === 'signup' ? 'auth-card__tab--active' : ''}`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              <UserPlus size={15} aria-hidden="true" /> Create account
            </button>
          </div>

          <form className="auth-card__form" onSubmit={submit}>
            {mode === 'signup' && (
              <>
                <label className="field">
                  <span className="field__label">Your name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="e.g. Priya Sen" />
                </label>
                <div className="auth-card__role" role="radiogroup" aria-label="Account type">
                  <span className="field__label">Account type</span>
                  <div className="auth-card__role-options">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={role === 'user'}
                      className={`auth-card__role-option ${role === 'user' ? 'auth-card__role-option--active' : ''}`}
                      onClick={() => setRole('user')}
                    >
                      <UtensilsCrossed size={16} aria-hidden="true" />
                      <span>
                        <strong>Food explorer</strong>
                        <small>Discover, save and review restaurants</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={role === 'restaurant_admin'}
                      className={`auth-card__role-option ${role === 'restaurant_admin' ? 'auth-card__role-option--active' : ''}`}
                      onClick={() => setRole('restaurant_admin')}
                    >
                      <Store size={16} aria-hidden="true" />
                      <span>
                        <strong>Restaurant partner</strong>
                        <small>Manage your restaurant's listing</small>
                      </span>
                    </button>
                  </div>
                  <p className="auth-card__role-note">
                    Admin accounts are created manually by the Khabo Kothay team — not available for
                    public signup.
                  </p>
                </div>
              </>
            )}
            <label className="field">
              <span className="field__label">Phone or email</span>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              <span className="field__label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
              />
            </label>
            {mode === 'login' && (
              <p className="auth-card__forgot">
                Forgot password? Demo accounts use <code>demo123</code>. Password reset will arrive
                with the account backend.
              </p>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="auth-card__demo">
            <p className="auth-card__demo-head">
              <Info size={13} aria-hidden="true" /> Demo accounts — password is <code>demo123</code>
            </p>
            <div className="auth-card__demo-list">
              {DEMO_ACCOUNT_CREDENTIALS.map((acc) => (
                <button
                  key={acc.contact}
                  type="button"
                  className="demo-account"
                  onClick={() => fillDemo(acc.contact)}
                >
                  <span className="demo-account__icon" aria-hidden="true">
                    {acc.role === 'executive' ? <ShieldCheck size={14} /> : acc.role === 'restaurant_admin' ? <UtensilsCrossed size={14} /> : <UserPlus size={14} />}
                  </span>
                  <span>
                    <strong>{acc.contact}</strong>
                    <small>
                      {acc.role === 'executive'
                        ? 'Khabo Kothay executive'
                        : acc.role === 'restaurant_admin'
                          ? `Restaurant admin · ${acc.restaurant}`
                          : 'Regular user'}
                    </small>
                  </span>
                </button>
              ))}
            </div>
            <p className="auth-card__demo-note">
              Demo authentication only — sessions live in your browser and passwords are hashed locally.
              No real OTPs, no real security guarantees.
            </p>
          </div>

          <p className="auth-card__foot">
            Want to just look around? <Link to="/explore">Browse restaurants free</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
