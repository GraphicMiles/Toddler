import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { Button, Container } from './components/UI';

const Auth = ({ mode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white flex overflow-hidden font-sans">
      {/* Visual Side (Left) */}
      <div className="hidden lg:flex lg:w-5/12 bg-[var(--color-bg-dark)] relative p-[var(--spacing-8)] flex-col justify-between overflow-hidden text-white">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        <Link to="/" className="flex items-center gap-[var(--spacing-2)] relative z-10 group no-underline text-white">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-[var(--color-bg-dark)] font-display font-bold text-xl group-hover:scale-110 transition-transform">T</div>
          <span className="font-display font-bold text-3xl tracking-tighter">Toddler</span>
        </Link>

        <div className="relative z-10 space-y-[var(--spacing-7)]">
          <div className="space-y-[var(--spacing-5)]">
            <h2 className="text-5xl md:text-6xl font-display font-bold leading-tight tracking-tighter max-w-md">
              {mode === 'login' ? 'Turn spreadsheets into intelligence.' : 'Start building the AI you actually own.'}
            </h2>
            <p className="text-white/50 text-xl font-medium max-w-sm">
              Domain experts are using Toddler to build proprietary tools without code.
            </p>
            <div className="space-y-[var(--spacing-4)] pt-[var(--spacing-5)]">
              {[
                "Synchronous training cycles",
                "100% data ownership",
                "Private by default"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-[var(--spacing-3)] text-xs font-bold uppercase tracking-widest text-white/30">
                  <Check size={14} className="text-[var(--color-accent)]" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold uppercase tracking-[0.4em] text-white/20">
          Secure by default · toddler_auth_v1.0.4
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center p-[var(--spacing-6)] pt-[var(--spacing-9)] sm:p-[var(--spacing-9)] relative bg-white overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-[var(--spacing-7)] left-[var(--spacing-6)]">
           <Link to="/" className="flex items-center gap-[var(--spacing-2)] no-underline text-[var(--color-text-primary)]">
            <div className="w-8 h-8 bg-[var(--color-text-primary)] rounded-lg flex items-center justify-center text-[var(--color-text-inverse)] font-display font-bold text-lg">T</div>
            <span className="font-display font-bold text-xl tracking-tighter">Toddler</span>
          </Link>
        </div>

        <div className="max-w-[400px] w-full mx-auto space-y-[var(--spacing-8)]">
          <div className="space-y-[var(--spacing-3)]">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter text-[var(--color-text-primary)]">
              {mode === 'login' ? 'Welcome back' : 'Create workspace'}
            </h1>
            <p className="text-[var(--color-text-muted)] text-lg font-medium">
              {mode === 'login' ? 'Enter your credentials to access your projects.' : 'Join the new era of non-technical AI building.'}
            </p>
          </div>

          <div className="space-y-[var(--spacing-7)]">
            {/* Social Auth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--spacing-4)]">
              <button onClick={handleGoogle} className="h-14 border border-[var(--color-border-subtle)] rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-[var(--spacing-3)] hover:bg-[var(--color-bg-base)] transition-all active:scale-95 cursor-pointer bg-transparent text-[var(--color-text-primary)]">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale" />
                Google
              </button>
              <button className="h-14 border border-[var(--color-border-subtle)] rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-[var(--spacing-3)] hover:bg-[var(--color-bg-base)] transition-all active:scale-95 cursor-pointer bg-transparent text-[var(--color-text-primary)]">
                <img src="https://www.apple.com/favicon.ico" alt="Apple" className="w-4 h-4 grayscale" />
                Apple ID
              </button>
            </div>

            <div className="relative flex items-center gap-[var(--spacing-5)] text-[var(--color-text-primary)]/10 uppercase font-bold text-[10px] tracking-[0.4em]">
              <div className="h-px bg-current grow" />
              <span>or email</span>
              <div className="h-px bg-current grow" />
            </div>

            {error && (
              <div className="p-[var(--spacing-4)] bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex gap-[var(--spacing-3)] items-center rounded-[var(--radius-lg)]">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-[var(--spacing-5)]">
              <div className="space-y-[var(--spacing-2)]">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Email address</label>
                <input 
                  type="email" required placeholder="name@company.com"
                  className="w-full h-16 px-[var(--spacing-6)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] focus:outline-none focus:bg-white focus:border-[var(--color-text-primary)] transition-all font-medium placeholder:text-[var(--color-text-primary)]/20"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-[var(--spacing-2)]">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Password</label>
                  {mode === 'login' && <a href="#" className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)] no-underline hover:underline">Forgot?</a>}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="••••••••••••"
                    className="w-full h-16 px-[var(--spacing-6)] bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] focus:outline-none focus:bg-white focus:border-[var(--color-text-primary)] transition-all font-medium placeholder:text-[var(--color-text-primary)]/20"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--color-text-primary)]/20 hover:text-[var(--color-text-primary)] transition-colors border-none bg-transparent cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button disabled={loading} type="submit" className="w-full h-16" loading={loading}>
                {mode === 'login' ? 'Sign in to workspace' : 'Create workspace'}
              </Button>
            </form>
          </div>

          <div className="pt-[var(--spacing-7)] border-t border-[var(--color-border-subtle)] text-center space-y-[var(--spacing-5)]">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">
              {mode === 'login' ? (
                <>Don't have an account? <Link to="/signup" className="text-[var(--color-text-primary)] font-bold no-underline hover:text-[var(--color-accent)] transition-colors">Sign up free</Link></>
              ) : (
                <>Already have an account? <Link to="/login" className="text-[var(--color-text-primary)] font-bold no-underline hover:text-[var(--color-accent)] transition-colors">Sign in here</Link></>
              )}
            </p>
            <div className="flex items-center justify-center gap-[var(--spacing-2)] text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-primary)]/20">
              <ShieldCheck size={14} /> Encrypted End-to-End
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
