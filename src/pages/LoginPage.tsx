import { useState, useEffect, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogIn, UserPlus, ShieldCheck, UtensilsCrossed, Store, Info, Copy, Timer,
  Soup, Bookmark, Sparkles, Gift, KeyRound, HelpCircle, MessageSquare, RefreshCw, Pencil,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { DEMO_ACCOUNT_CREDENTIALS } from '../hooks/useAccounts';
import { Button, Field } from '../components/ui';

const isDevMock = import.meta.env.VITE_DEV_AUTH_MOCK === 'true';

/**
 * The sign-in stage.
 *
 * Authentication here is phone + one-time code, and nothing else — there is no
 * password anywhere in the system. That is why this page has no "forgot
 * password" link: there is nothing to reset. The recovery block states the
 * actual routes back into an account instead of linking to a flow that cannot
 * exist.
 *
 * The left panel is type and colour only, no photograph, so it cannot break on
 * a missing asset and costs nothing to load in front of a sign-in.
 */

/** Human label for a seeded demo login, built from the role it actually has. */
function demoAccountLabel(acc: (typeof DEMO_ACCOUNT_CREDENTIALS)[number]): string {
  if (acc.role === 'executive') return 'Khabo Kothay executive';
  if (acc.role === 'restaurant_admin') {
    return acc.restaurant ? `Restaurant admin · ${acc.restaurant}` : 'Restaurant admin';
  }
  return acc.note ? `Regular user · ${acc.note}` : 'Regular user';
}

export default function LoginPage() {
  usePageTitle('Sign in');
  const { sendOtp, verifyOtp, resendOtp, canResendOtp, loginWithVerifiedPhone, signup, checkPhoneExists } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const intent = new URLSearchParams(location.search).get('intent');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [mode, setMode] = useState<'login' | 'signup'>(intent === 'partner' ? 'signup' : 'login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  /**
   * Which control the current `error` is *about*. One error state serves three
   * different causes here — a rejected name, a phone that does or does not
   * already have an account, and a transport failure that is nobody's typing —
   * and until they were told apart, every message rendered in the same
   * detached paragraph under the form. That paragraph is still the right place
   * for a transport failure, but "no account found" is a fact about the phone
   * box, so it now rides on that box, where `Field` turns it into
   * `aria-invalid` + `aria-describedby` and someone tabbing back hears why.
   * `null` means form-level.
   */
  const [errorField, setErrorField] = useState<'name' | 'phone' | 'otp' | null>(null);
  /** Both halves of an error move together, so they are set together. */
  const fail = (message: string, field: 'name' | 'phone' | 'otp' | null = null) => {
    setError(message);
    setErrorField(field);
  };
  const clearError = () => {
    setError(null);
    setErrorField(null);
  };
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [timerTick, setTimerTick] = useState(0);
  // Signup intent: a Food Explorer gets a normal user account; a Restaurant
  // Partner is routed to the application form after OTP. Crucially, selecting
  // "Restaurant Partner" NEVER creates a restaurant_admin — ownership is granted
  // only later by the executive approval workflow.
  const [signupIntent, setSignupIntent] = useState<'explorer' | 'partner'>(
    intent === 'partner' ? 'partner' : 'explorer',
  );

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    clearError();

    // Validate name in signup mode
    if (mode === 'signup') {
      const nameError = validateName(name);
      if (nameError) {
        fail(nameError, 'name');
        setBusy(false);
        return;
      }
    }

    let result: { ok: boolean; error?: string; otp?: string } | null = null;
    if (step === 'phone') {
      // In signup mode, check for duplicate phone BEFORE sending OTP
      if (mode === 'signup' && signupIntent !== 'partner' && checkPhoneExists(phoneNumber)) {
        fail('An account with this phone number already exists. Please sign in.', 'phone');
        setBusy(false);
        return;
      }
      // In login mode, check if account exists BEFORE sending OTP
      if (mode === 'login' && !checkPhoneExists(phoneNumber)) {
        fail('No account found. Please create an account first.', 'phone');
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
            fail(loginResult.error ?? 'We could not sign you in. Try once more.');
          }
        } else if (mode === 'signup') {
          // A restaurant partner applicant may already have a normal user
          // account. Sign in if one exists; otherwise create a `user` account.
          // Ownership is never granted here — only via KK executive approval.
          const target = signupIntent === 'partner' ? '/restaurant/apply' : from;
          let result = await loginWithVerifiedPhone(phoneNumber);
          if (!result.ok) {
            result = await signup(name, phoneNumber, 'user');
          }
          if (result.ok) {
            navigate(target, { replace: true, state: signupIntent === 'partner' ? { phone: phoneNumber } : undefined });
          } else {
            fail(result.error ?? 'We could not set up your account. Try once more.');
          }
        }
      }
    }

    setBusy(false);
    if (!result || !result.ok) {
      /**
       * The only call that can have failed by here is the one this step made:
       * `sendOtp` on the phone step, `verifyOtp` on the code step. So the
       * message belongs to that step's box — a rejected code is a fact about
       * the code, not a notice about the form.
       */
      fail(result?.error ?? 'That did not go through. Try once more.', step === 'phone' ? 'phone' : 'otp');
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
      // A resend that fails is a fact about the request, not about anything
      // typed, so it stays form-level.
      fail(result.error ?? 'Failed to resend OTP');
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
    <div className="auth-page">
      <aside className="auth-page__aside">
        <Link to="/" className="auth-page__brand">
          <Soup aria-hidden="true" />
          <strong>Khabo Kothay</strong>
        </Link>

        <div className="auth-page__pitch">
          <h2>
            Where do we <em>eat</em> today?
          </h2>
          <p>
            Sign in with your phone number. Browsing Dhaka stays free — an account is what remembers
            your places and your taste.
          </p>
          <ul className="auth-page__points">
            <li>
              <Bookmark aria-hidden="true" />
              <span>Save places and favourites into a collection you can come back to.</span>
            </li>
            <li>
              <Sparkles aria-hidden="true" />
              <span>Match scores that explain themselves, built from the preferences you set.</span>
            </li>
            <li>
              <Gift aria-hidden="true" />
              <span>
                Reward tokens for reviews, referrals and a complete food profile — a demo programme
                for now, not a discount you can spend.
              </span>
            </li>
            <li>
              <KeyRound aria-hidden="true" />
              <span>No password to remember. A one-time code on your phone is the whole login.</span>
            </li>
          </ul>
        </div>

        <p className="auth-page__foot">Khabo Kothay · Dhaka · where to eat</p>
      </aside>

      <div className="auth-page__stage">
        <div className="auth-card">
          <div className="auth-card__head">
            <h1>
              {step === 'otp'
                ? 'Check your phone'
                : mode === 'login'
                  ? 'Welcome back'
                  : 'Create your account'}
            </h1>
            <p>
              {step === 'otp'
                ? 'Enter the six digits we just sent to finish signing in.'
                : mode === 'login'
                  ? 'Enter your phone number and we’ll send a one-time code.'
                  : 'It takes a phone number and a name. Nothing else.'}
            </p>
          </div>

          <div className="auth-card__tabs" role="tablist" aria-label="Auth mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className="auth-card__tab"
              onClick={() => { setMode('login'); setStep('phone'); clearError(); setDevOtp(null); }}
            >
              <LogIn size={16} aria-hidden="true" /> Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className="auth-card__tab"
              onClick={() => { setMode('signup'); setStep('phone'); clearError(); setDevOtp(null); }}
            >
              <UserPlus size={16} aria-hidden="true" /> Create account
            </button>
          </div>

          {isDevMock && step === 'otp' && devOtp && (
            <div className="dev-otp-banner auth-card__dev-otp" role="status" aria-live="polite">
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
            <div className="console-banner" role="note">
              <Info size={16} aria-hidden="true" />
              <div className="console-banner__body">
                <strong>Development mode</strong>
                <p>One-time codes are shown on screen. No SMS is sent.</p>
              </div>
            </div>
          )}

          <form onSubmit={submit}>
            {step === 'phone' && (
              <>
                {mode === 'signup' && (
                  <>
                    {/* `role="radiogroup"` used to sit on the outer wrapper, which
                        contained the label span and a nested div — so the group
                        owned two children and neither of them was a radio, and
                        the radios themselves belonged to nothing. It moves onto
                        the element that actually holds them, and `Field group`
                        supplies the name from the visible label instead of a
                        second `aria-label` nobody could see. */}
                    <Field label="Account type" group className="auth-card__role">
                      <div className="auth-card__role-options" role="radiogroup">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={signupIntent === 'explorer'}
                          className={`auth-card__role-option ${signupIntent === 'explorer' ? 'auth-card__role-option--on' : ''}`}
                          onClick={() => setSignupIntent('explorer')}
                        >
                          <UtensilsCrossed size={16} aria-hidden="true" />
                          <span>
                            <strong>Food Explorer</strong>
                            <small>Discover, save and review restaurants</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={signupIntent === 'partner'}
                          className={`auth-card__role-option ${signupIntent === 'partner' ? 'auth-card__role-option--on' : ''}`}
                          onClick={() => setSignupIntent('partner')}
                        >
                          <Store size={16} aria-hidden="true" />
                          <span>
                            <strong>Restaurant Partner</strong>
                            <small>Apply to list your restaurant (approval required)</small>
                          </span>
                        </button>
                      </div>
                    </Field>
                    <Field label="Your name" error={errorField === 'name' ? error : undefined}>
                      <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="e.g. Priya Sen" />
                    </Field>
                    {signupIntent === 'partner' && (
                      <div className="console-banner console-banner--pending" role="note">
                        <Store size={16} aria-hidden="true" />
                        <div className="console-banner__body">
                          <strong>This creates an application, not a listing</strong>
                          <p>
                            You’ll get a normal account now. A Khabo Kothay reviewer activates
                            restaurant management only after approving your venue.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
                <Field
                  label="Phone number"
                  hint="A Bangladesh mobile number. The one-time code is sent here."
                  error={errorField === 'phone' ? error : undefined}
                >
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="e.g. 01XXXXXXXXX or +880XXXXXXXXX"
                  />
                </Field>

                {/* Only what no single control owns. A message the phone box
                    is already carrying would otherwise be announced twice —
                    once by `Field`'s `role="alert"` and once by this one. */}
                {error && errorField === null && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}

                {/* `busy` carries the spinner and `aria-busy` now, so the only
                    evidence of a request in flight is no longer one word
                    changing. `className` is the auth card's own width hook —
                    layout, which §11 lets a call site add. */}
                <Button type="submit" variant="primary" className="auth-card__submit" busy={busy}>
                  {busy ? 'Sending code…' : 'Send one-time code'}
                </Button>
              </>
            )}

            {step === 'otp' && (
              <>
                {/* The verification state. It states the number the code went to
                    and offers the way back, because a mistyped digit is the most
                    likely reason this screen fails. */}
                <div className="console-banner" role="status">
                  <ShieldCheck size={16} aria-hidden="true" />
                  <div className="console-banner__body">
                    <strong>Code sent to {phoneNumber}</strong>
                    <p>It arrives by SMS and is valid for five minutes.</p>
                  </div>
                  <div className="console-banner__actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Pencil}
                      onClick={() => { setStep('phone'); setOtpCode(''); clearError(); setDevOtp(null); setOtpExpiresAt(null); }}
                    >
                      Change
                    </Button>
                  </div>
                </div>

                <Field
                  label="Enter the 6-digit code"
                  error={errorField === 'otp' ? error : undefined}
                >
                  <input
                    className="t-num"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    placeholder="––––––"
                  />
                </Field>

                <div className="auth-card__otp-actions">
                  {/*
                    Two corrections here, not just a class swap.

                    `canResendOtp()` was called with no argument. It normalises
                    `phoneNumber ?? ''` and looks the cooldown up by number, so
                    an empty string found no record and always answered `true`
                    — the control claimed you could resend the whole minute the
                    adapter would refuse to, and `handleResendOtp` returns
                    silently in that window. Passing the number makes the
                    button tell the truth.

                    And `unavailable` rather than `disabled`, so the cooldown is
                    something the control can say out loud instead of a hole in
                    the tab order.
                  */}
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    busy={busy}
                    unavailable={!canResendOtp(phoneNumber)}
                    unavailableReason="A code was just sent — you can ask for another in about a minute."
                    onClick={handleResendOtp}
                  >
                    {busy ? 'Sending…' : 'Resend code'}
                  </Button>

                  <p className="auth-card__otp-tip">
                    Codes expire after five minutes and the number of attempts is limited.
                  </p>
                </div>

                {error && errorField === null && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}

                <Button type="submit" variant="primary" className="auth-card__submit" busy={busy}>
                  {busy ? 'Verifying…' : mode === 'login' ? 'Verify and sign in' : 'Verify and continue'}
                </Button>
              </>
            )}
          </form>

          {/* There is no password in this system, so there is no reset. This is
              what recovery actually looks like here. */}
          <div className="auth-card__recovery">
            <strong>Trouble signing in?</strong>
            <ul>
              <li>
                <HelpCircle aria-hidden="true" />
                <span>
                  There is no password to reset — the one-time code sent to your phone is the whole
                  login.
                </span>
              </li>
              <li>
                <RefreshCw aria-hidden="true" />
                <span>
                  If the code doesn’t arrive, check the number for a typo, then use <em>Resend code</em>.
                </span>
              </li>
              <li>
                <MessageSquare aria-hidden="true" />
                <span>
                  Lost access to that number? <Link to="/contact">Contact us</Link> and we’ll move
                  your account across.
                </span>
              </li>
            </ul>
          </div>

          {/* Demo accounts — development only, Sign In tab, and only while a
              number is still being chosen. Once a code is out, offering to
              switch account underneath the code that was sent is just noise. */}
          {isDevMock && mode === 'login' && step === 'phone' && (
            <div className="auth-card__demo">
              <p className="auth-card__demo-head">
                <Info size={14} aria-hidden="true" /> Demo accounts (development only)
              </p>
              <div className="auth-card__demo-list">
                {DEMO_ACCOUNT_CREDENTIALS.map((acc) => (
                  <button
                    key={acc.contact}
                    type="button"
                    className="demo-account"
                    onClick={() => {
                      setPhoneNumber(acc.contact);
                      // Auto-send OTP for demo
                      sendOtp(acc.contact).then(result => {
                        if (!result.ok) {
                          fail(result.error ?? 'Could not start the demo sign-in.', 'phone');
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
                      <small>{demoAccountLabel(acc)}</small>
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

          {/* The partner route used to be a Link to /login?intent=partner, which
              does nothing when you are already on /login — the intent is only
              read at mount. Same destination, expressed as the state change it
              actually is. */}
          <p className="auth-card__alt">
            Just looking? <Link to="/explore">Browse restaurants free</Link> — or if you run a venue,{' '}
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setSignupIntent('partner');
                setStep('phone');
                clearError();
                setDevOtp(null);
              }}
            >
              list it on Khabo Kothay
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}