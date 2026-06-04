/**
 * Auth Pages — Sign In, Sign Up, Forgot Password
 * Spotify-inspired UI with animated backgrounds, split-panel layout
 * and full error/state handling.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import { authService } from '../services';
import toast from 'react-hot-toast';
import {
  FaMusic, FaEye, FaEyeSlash, FaCheck, FaEnvelope,
  FaLock, FaUser, FaArrowRight, FaCircleCheck,
} from 'react-icons/fa6';

// ── Animated floating note decorations ───────────────────────────────────────
const NOTES = ['🎵', '🎶', '🎸', '🎹', '🥁', '🎺', '🎻', '🎧'];

function FloatingNotes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      {NOTES.map((note, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl opacity-10"
          style={{
            left: `${10 + (i * 11) % 85}%`,
            top: `${5 + (i * 17) % 80}%`,
          }}
          animate={{
            y: [0, -20, 0],
            rotate: [0, i % 2 === 0 ? 10 : -10, 0],
            opacity: [0.06, 0.14, 0.06],
          }}
          transition={{
            duration: 4 + i * 0.7,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.4,
          }}
        >
          {note}
        </motion.span>
      ))}
    </div>
  );
}

// ── Feature list shown on the left panel ────────────────────────────────────
const FEATURES = [
  'Stream millions of free, legal tracks',
  'Create and share playlists',
  'Discover music by genre & mood',
  'Real-time listening activity',
];

// ── Shared layout ────────────────────────────────────────────────────────────
function AuthLayout({ children, title, subtitle, panel }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">

      {/* ── Left brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-gradient-to-br from-[#0f2010] via-[#0a1a0a] to-[#000] flex-col justify-between p-12 overflow-hidden">
        {/* Glowing orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-spotify-green/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" />
        <FloatingNotes />

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 bg-spotify-green rounded-full flex items-center justify-center shadow-glow-green">
            <FaMusic size={20} className="text-black" />
          </div>
          <span className="text-white font-black text-3xl tracking-tight">MusicNest</span>
        </Link>

        {/* Central copy */}
        <div className="z-10 space-y-8">
          <div>
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-4">
              {panel?.heading ?? 'Your music,\nyour world.'}
            </h2>
            <p className="text-white/50 text-lg leading-relaxed">
              {panel?.sub ?? 'Free, legal, and endlessly beautiful music — all in one place.'}
            </p>
          </div>

          {/* Feature checklist */}
          <ul className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-center gap-3 text-white/70 text-sm"
              >
                <FaCircleCheck className="text-spotify-green flex-shrink-0" size={16} />
                {f}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Bottom tagline */}
        <p className="text-white/20 text-xs z-10">
          Powered by Jamendo · Free Creative Commons music
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 overflow-y-auto">
        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-10 h-10 bg-spotify-green rounded-full flex items-center justify-center shadow-glow-green">
            <FaMusic size={16} className="text-black" />
          </div>
          <span className="text-white font-black text-2xl">MusicNest</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <h1 className="text-3xl font-black text-white mb-2">{title}</h1>
          <p className="text-white/50 mb-8 text-sm">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

// ── Reusable input ────────────────────────────────────────────────────────────
function FormInput({ id, label, type = 'text', value, onChange, placeholder, icon: Icon, rightEl, error, ...rest }) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-white/70 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-white/5 border rounded-lg px-4 py-3.5 text-white placeholder-white/25 text-sm
            focus:outline-none focus:ring-2 transition-all duration-200
            ${Icon ? 'pl-10' : ''}
            ${rightEl ? 'pr-12' : ''}
            ${error
              ? 'border-red-500/60 focus:ring-red-500/30'
              : 'border-white/10 focus:border-spotify-green/60 focus:ring-spotify-green/20'
            }`}
          {...rest}
        />
        {rightEl && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-red-400 text-xs mt-1.5"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Password strength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-spotify-green'];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score - 1] : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${score >= 3 ? 'text-spotify-green' : 'text-white/40'}`}>
        Password strength: {labels[Math.max(0, score - 1)]}
      </p>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/30 text-xs font-medium uppercase tracking-widest">or</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function LoginPage() {
  const { login, isLoading } = useAuthStore();
  const { connect } = useSocketStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await login(form);
    if (result.success) {
      const token = localStorage.getItem('accessToken');
      if (token) connect(token);
      toast.success('Welcome back! 🎵');
      navigate('/');
    } else {
      // Surface specific server messages
      const msg = result.message || 'Login failed';
      if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('password')) {
        setErrors({ password: 'Invalid email or password' });
      } else if (msg.toLowerCase().includes('banned')) {
        toast.error('Your account has been suspended.');
      } else if (msg.toLowerCase().includes('verif')) {
        toast.error('Please verify your email before logging in. Check your inbox.', { duration: 5000 });
      } else {
        toast.error(msg);
      }
    }
  };

  const EyeBtn = (
    <button
      type="button"
      onClick={() => setShowPass(s => !s)}
      className="text-white/30 hover:text-white/70 transition-colors"
      tabIndex={-1}
      aria-label={showPass ? 'Hide password' : 'Show password'}
    >
      {showPass ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
    </button>
  );

  return (
    <AuthLayout
      title="Log in to MusicNest"
      subtitle="Welcome back! Pick up where you left off."
      panel={{
        heading: 'Welcome\nback.',
        sub: 'Your playlists, your history, your vibe — all waiting for you.',
      }}
    >
      <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormInput
          id="login-email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })); }}
          placeholder="you@example.com"
          icon={FaEnvelope}
          error={errors.email}
          autoComplete="email"
          required
        />

        <FormInput
          id="login-password"
          label="Password"
          type={showPass ? 'text' : 'password'}
          value={form.password}
          onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
          placeholder="Your password"
          icon={FaLock}
          rightEl={EyeBtn}
          error={errors.password}
          autoComplete="current-password"
          required
        />

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-xs text-white/40 hover:text-spotify-green transition-colors underline underline-offset-2"
          >
            Forgot your password?
          </Link>
        </div>

        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full bg-spotify-green text-black font-bold py-3.5 px-8 rounded-full
            hover:bg-[#1ed760] hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-200 shadow-glow-green
            disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100
            flex items-center justify-center gap-2 text-sm"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          ) : (
            <>Log In <FaArrowRight size={13} /></>
          )}
        </button>

        <OrDivider />

        <p className="text-center text-white/40 text-sm">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-white font-bold hover:text-spotify-green transition-colors"
          >
            Sign up for free
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGISTER / SIGN UP PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function RegisterPage() {
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors]        = useState({});
  const [success, setSuccess]      = useState(false);

  const validate = () => {
    const e = {};
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.length < 3) e.username = 'Username must be at least 3 characters';
    else if (form.username.length > 30) e.username = 'Username can be at most 30 characters';
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) e.username = 'Only letters, numbers, and underscores allowed';

    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address';

    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';

    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await register({
      username: form.username,
      email: form.email,
      password: form.password,
    });

    if (result.success) {
      setSuccess(true);
    } else {
      const msg = result.message || 'Registration failed';
      if (msg.toLowerCase().includes('email')) {
        setErrors(er => ({ ...er, email: 'This email is already registered' }));
      } else if (msg.toLowerCase().includes('username')) {
        setErrors(er => ({ ...er, username: 'This username is already taken' }));
      } else {
        toast.error(msg);
      }
    }
  };

  // ── Success state ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout
        title="Check your inbox!"
        subtitle="One more step to get started."
        panel={{ heading: 'Almost\nthere!', sub: 'Verify your email and start listening in seconds.' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 bg-spotify-green/15 rounded-full flex items-center justify-center mx-auto border border-spotify-green/30">
            <FaEnvelope size={32} className="text-spotify-green" />
          </div>

          <div className="space-y-2">
            <p className="text-white/60 text-sm leading-relaxed">
              We sent a verification link to
            </p>
            <p className="text-white font-bold text-base break-all">{form.email}</p>
            <p className="text-white/40 text-xs">
              Please check your inbox (and spam folder) and click the link to activate your account.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              to="/login"
              id="go-to-login-btn"
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <FaCheck size={13} /> Go to Login
            </Link>
            <button
              onClick={() => setSuccess(false)}
              className="w-full text-white/30 text-sm hover:text-white/60 transition-colors"
            >
              ← Back to sign up
            </button>
          </div>
        </motion.div>
      </AuthLayout>
    );
  }

  const EyeBtn = (show, setShow) => (
    <button
      type="button"
      onClick={() => setShow(s => !s)}
      className="text-white/30 hover:text-white/70 transition-colors"
      tabIndex={-1}
    >
      {show ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
    </button>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It's free and always will be."
      panel={{
        heading: 'Start\nlistening\nfor free.',
        sub: 'Millions of tracks, zero cost. Join the MusicNest community today.',
      }}
    >
      <form id="register-form" onSubmit={handleSubmit} noValidate className="space-y-4">

        <FormInput
          id="register-username"
          label="Username"
          type="text"
          value={form.username}
          onChange={e => { setForm(f => ({ ...f, username: e.target.value })); setErrors(er => ({ ...er, username: '' })); }}
          placeholder="coolmusician123"
          icon={FaUser}
          error={errors.username}
          autoComplete="username"
          minLength={3}
          maxLength={30}
          required
        />

        <FormInput
          id="register-email"
          label="Email address"
          type="email"
          value={form.email}
          onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })); }}
          placeholder="you@example.com"
          icon={FaEnvelope}
          error={errors.email}
          autoComplete="email"
          required
        />

        <div>
          <FormInput
            id="register-password"
            label="Password"
            type={showPass ? 'text' : 'password'}
            value={form.password}
            onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })); }}
            placeholder="At least 6 characters"
            icon={FaLock}
            rightEl={EyeBtn(showPass, setShowPass)}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <PasswordStrength password={form.password} />
        </div>

        <FormInput
          id="register-confirm-password"
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={e => { setForm(f => ({ ...f, confirmPassword: e.target.value })); setErrors(er => ({ ...er, confirmPassword: '' })); }}
          placeholder="Repeat your password"
          icon={FaLock}
          rightEl={EyeBtn(showConfirm, setShowConfirm)}
          error={errors.confirmPassword}
          autoComplete="new-password"
          required
        />

        <p className="text-white/25 text-xs pt-1 leading-relaxed">
          By creating an account you agree to our{' '}
          <span className="underline cursor-pointer hover:text-white/50 transition-colors">Terms of Service</span>
          {' '}and{' '}
          <span className="underline cursor-pointer hover:text-white/50 transition-colors">Privacy Policy</span>.
        </p>

        <button
          id="register-submit-btn"
          type="submit"
          disabled={isLoading}
          className="w-full bg-spotify-green text-black font-bold py-3.5 px-8 rounded-full
            hover:bg-[#1ed760] hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-200 shadow-glow-green
            disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100
            flex items-center justify-center gap-2 text-sm mt-2"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          ) : (
            <>Create Account <FaArrowRight size={13} /></>
          )}
        </button>

        <OrDivider />

        <p className="text-center text-white/40 text-sm">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-white font-bold hover:text-spotify-green transition-colors"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [emailError, setEmailError] = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) { setEmailError('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email address'); return false; }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="Reset link on its way."
        panel={{ heading: 'Reset your\npassword.', sub: 'Check your inbox for the reset link.' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 bg-spotify-green/15 rounded-full flex items-center justify-center mx-auto border border-spotify-green/30">
            <FaEnvelope size={32} className="text-spotify-green" />
          </div>
          <div className="space-y-2">
            <p className="text-white/50 text-sm">
              If an account with <strong className="text-white">{email}</strong> exists,{' '}
              you'll receive a reset link within a few minutes.
            </p>
            <p className="text-white/30 text-xs">Don't forget to check your spam folder.</p>
          </div>
          <Link
            to="/login"
            id="back-to-login-btn"
            className="btn-primary inline-flex items-center gap-2 w-full justify-center"
          >
            ← Back to Login
          </Link>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      panel={{ heading: 'Reset your\npassword.', sub: 'We\'ll get you back into your account in no time.' }}
    >
      <form id="forgot-password-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormInput
          id="forgot-email"
          label="Email address"
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setEmailError(''); }}
          placeholder="your@email.com"
          icon={FaEnvelope}
          error={emailError}
          autoComplete="email"
          required
        />

        <button
          id="send-reset-btn"
          type="submit"
          disabled={loading}
          className="w-full bg-spotify-green text-black font-bold py-3.5 px-8 rounded-full
            hover:bg-[#1ed760] hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-200 shadow-glow-green
            disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100
            flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
          ) : (
            <>Send Reset Link <FaArrowRight size={13} /></>
          )}
        </button>

        <Link
          to="/login"
          className="block text-center text-white/40 text-sm hover:text-white/70 transition-colors"
        >
          ← Back to Login
        </Link>
      </form>
    </AuthLayout>
  );
}
