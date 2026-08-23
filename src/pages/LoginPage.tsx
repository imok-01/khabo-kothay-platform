import { useState, useEffect, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldCheck, UtensilsCrossed, Store, Info, Copy, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';

const isDevMock = import.meta.env.VITE_DEV_AUTH_MOCK === 'true';

export default function LoginPage() {
  usePageTitle('Sign in');
  const { sendOtp, verifyOtp, resendOtp, canResendOtp, loginWithVerifiedPhone, signup, checkPhoneExists } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [signupRole, setSignupRole] = useState<'user' | 'restaurant_admin'>('user');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [timerTick, setTimerTick] = useState(0);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    
    // Validate name in signup mode
    if (mode === 'signup') {
      const nameError = validateName(name);
      if (nameError) {
        setError(nameError);
        setBusy(false);
        return;
      }
    }
    
    let result: { ok: boolean; error?: string; otp?: string } | null = null;
    if (step === 'phone') {
      // In signup mode, check for duplicate phone BEFORE sending OTP
      if (mode === 'signup' && checkPhoneExists(phoneNumber)) {
        setError('An account with this phone number already exists. Please sign in.');
        setBusy(false);
        return;
      }
      // In login mode, check if account exists BEFORE sending OTP
      if (mode === 'login' && !checkPhoneExists(phoneNumber)) {
        setError('No account found. Please create an account first.');
        setBusy(false);
        return;
      }
      // Send OTP
      result = await sendOtp(phoneNumber);
      if (result.ok) {
        setStep('otp');
        if (isDevMock && result.otp) {
          setDevOtp(result.otp);
          setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
        }
      }
    } else if (step === 'otp') {
      // Verify OTP
      result = await verifyOtp(phoneNumber, otpCode);
      if (result.ok) {
        setDevOtp(null);
        setOtpExpiresAt(null);
        // OTP verified, now log in or sign up
        if (mode === 'login') {
          const loginResult = await loginWithVerifiedPhone(phoneNumber);
          if (loginResult.ok) {
            navigate(from, { replace: true });
          } else {
            setError(loginResult.error ?? 'Failed to log in. Please try again.');
          }
        } else if (mode === 'signup') {
          const signupResult = await signup(name, phoneNumber, signupRole);
          if (signupResult.ok) {
            navigate(from, { replace: true });
          } else {
            setError(signupResult.error ?? 'Failed to create account. Please try again.');
          }
        }
      }
    }
    
    setBusy(false);
    if (!result || !result.ok) {
      setError(result?.error ?? 'Something went wrong.');
      return;
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp(phoneNumber)) return;
    setBusy(true);
    const result = await resendOtp(phoneNumber);
    setBusy(false);
    if (result.ok) {
      if (isDevMock && result.otp) {
        setDevOtp(result.otp);
        setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
      }
      setOtpCode('');
    } else {
      setError(result.error ?? 'Failed to resend OTP');
    }
  };

  const copyOtp = () => {
    if (devOtp) {
      navigator.clipboard.writeText(devOtp);
    }
  };

  const validateName = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Please enter a valid name using letters only.';
    }
    // Only allow letters (English + Bengali) and spaces
    if (!/^[a-zA-Z\u0980-\u09FF\s]+$/.test(trimmed)) {
      return 'Please enter a valid name using letters only.';
    }
    // Count alphabetic characters
    const alphaCount = (trimmed.match(/[a-zA-Z\u0980-\u09FF]/g) || []).length;
    if (alphaCount < 2) {
      return 'Please enter a valid name using letters only.';
    }
    return null;
  };

  const getTimeRemaining = (_timerTick: number) => {
    if (!otpExpiresAt) return '00:00';
    const remaining = Math.max(0, otpExpiresAt - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // OTP countdown timer - updates every second to trigger re-renders
  useEffect(() => {
    if (!otpExpiresAt) return;
    
    const intervalId = setInterval(() => {
      if (Date.now() >= otpExpiresAt) {
        setOtpExpiresAt(null);
        setDevOtp(null);
      } else {
        // Update timerTick to trigger re-render every second
        setTimerTick(prev => prev + 1);
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [otpExpiresAt]);

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
              onClick={() => { setMode('login'); setStep('phone'); setError(null); setDevOtp(null); }}
            >
              <LogIn size={15} aria-hidden="true" /> Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-card__tab ${mode === 'signup' ? 'auth-card__tab--active' : ''}`}
              onClick={() => { setMode('signup'); setStep('phone'); setError(null); setDevOtp(null); setSignupRole('user'); }}
            >
              <UserPlus size={15} aria-hidden="true" /> Create account
            </button>
          </div>

          {isDevMock && step === 'otp' && devOtp && (
            <div className="dev-otp-banner" role="status" aria-live="polite">
              <div className="dev-otp-banner__header">
                <span className="dev-otp-banner__badge">DEVELOPMENT MODE</span>
                <span className="dev-otp-banner__note">OTP displayed because SMS delivery is disabled</span>
              </div>
              <div className="dev-otp-banner__code">
                <code>{devOtp}</code>
                <button
                  type="button"
                  className="dev-otp-banner__copy"
                  onClick={copyOtp}
                  aria-label="Copy OTP to clipboard"
                >
                  <Copy size={14} aria-hidden="true" />
                </button>
              </div>
              <div className="dev-otp-banner__expiry">
                <Timer size={14} aria-hidden="true" />
                <span>Expires in {getTimeRemaining(timerTick)}</span>
              </div>
            </div>
          )}

          {mode === 'signup' && step === 'phone' && isDevMock && (
            <div className="dev-hint" role="note">
              <Info size={13} aria-hidden="true" />
              <span>Development mode: OTPs are shown on screen. No SMS is sent.</span>
            </div>
          )}

          <form className="auth-card__form" onSubmit={submit}>
            {step === 'phone' && (
              <>
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
                              aria-checked={signupRole === 'user'}
                              className={`auth-card__role-option ${signupRole === 'user' ? 'auth-card__role-option--active' : ''}`}
                              onClick={() => setSignupRole('user')}
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
                              aria-checked={signupRole === 'restaurant_admin'}
                              className={`auth-card__role-option ${signupRole === 'restaurant_admin' ? 'auth-card__role-option--active' : ''}`}
                              onClick={() => setSignupRole('restaurant_admin')}
                            >
                              <Store size={16} aria-hidden="true" />
                              <span>
                                <strong>Restaurant partner</strong>
                                <small>Manage your restaurant's listing</small>
                              </span>
                            </button>
                          </div>
                          <p className="auth-card__role-note">
                            Restaurant partner accounts require Khabo Kothay onboarding.
                          </p>
                        </div>
                      </>
                    )}
                <label className="field">
                  <span className="field__label">Phone number</span>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    autoComplete="tel"
                    placeholder="e.g. 01XXXXXXXXX or +880XXXXXXXXX"
                  />
                </label>
                
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </>
            )}
            
            {step === 'otp' && (
              <>
                <p className="field">
                  <span className="field__label">We've sent an OTP to</span>
                  <strong>{phoneNumber}</strong>
                </p>
                
                <label className="field">
                  <span className="field__label">Enter OTP</span>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="______"
                  />
                </label>
                
                <div className="auth-card__otp-actions">
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleResendOtp}
                    disabled={!canResendOtp() || busy}
                  >
                    {busy ? 'Sending…' : 'Resend OTP'}
                  </button>
                  
                  <p className="auth-card__otp-tip">
                    OTP expires in 5 minutes. Maximum attempts allowed.
                  </p>
                </div>
                
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}

                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? 'Verifying…' : 'Verify OTP'}
                </button>
              </>
            )}
          </form>

          {/* Demo accounts section - development only, Sign In tab only */}
          {isDevMock && mode === 'login' && (
            <div className="auth-card__demo">
              <p className="auth-card__demo-head">
                <Info size={13} aria-hidden="true" /> Demo accounts (development only)
              </p>
              <div className="auth-card__demo-list">
                {[
                  { contact: '01712345678', role: 'executive', label: 'Khabo Kothay executive' },
                  { contact: '01812345678', role: 'restaurant_admin', label: 'Restaurant admin · Seasonal Tastes' },
                  { contact: '01912345678', role: 'restaurant_admin', label: 'Restaurant admin · Almajlis Arabian Restaurant' },
                  { contact: '01612345678', role: 'user', label: 'Regular user' },
                  { contact: '01512345678', role: 'user', label: 'Regular user' },
                  { contact: '01412345678', role: 'restaurant_admin', label: 'Restaurant admin · KK Demo Restaurant' },
                ].map((acc) => (
                  <button
                    key={acc.contact}
                    type="button"
                    className="demo-account"
                    onClick={() => {
                      setPhoneNumber(acc.contact);
                      // Auto-send OTP for demo
                      sendOtp(acc.contact).then(result => {
                        if (!result.ok) {
                          setError(result.error ?? null);
                        }
                        // Move to OTP step if OTP sent successfully
                        if (result.ok) {
                          setStep('otp');
                          if (isDevMock && result.otp) {
                            setDevOtp(result.otp);
                            setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
                          }
                        }
                      });
                    }}
                  >
                    <span className="demo-account__icon" aria-hidden="true">
                      {acc.role === 'executive' ? <ShieldCheck size={14} /> : acc.role === 'restaurant_admin' ? <UtensilsCrossed size={14} /> : <UserPlus size={14} />}
                    </span>
                    <span>
                      <strong>{acc.contact}</strong>
                      <small>{acc.label}</small>
                    </span>
                  </button>
                ))}
              </div>
              <p className="auth-card__demo-note">
                These demo accounts use valid Bangladesh mobile formats (01X XXXX XXXX).
                In development mode, OTPs are displayed on screen. No SMS is sent.
              </p>
            </div>
          )}

          <p className="auth-card__foot">
            Want to just look around? <Link to="/explore">Browse restaurants free</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}