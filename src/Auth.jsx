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
    <div className="min-h-screen bg-[var(--color-bg-base)] flex overflow-hidden font-sans">
      {/* Visual Branding Side */}
      <div className="hidden lg:flex lg:w-5/12 bg-[var(--color-bg-dark)] relative p-[var(--spacing-8)] flex-col justify-between overflow-hidden text-white border-r border-white/5">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        {/* Glowing Geometric Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[120%] h-[120%] border border-[var(--color-accent-purple)]/30 rounded-full animate-[spin_100s_linear_infinite]" />
          <div className="absolute w-[80%] h-[80%] border border-[var(--color-accent-green)]/20 rounded-full animate-[spin_60s_linear_reverse_infinite]" />
        </div>

        <Link to="/" className="flex items-center gap-[var(--spacing-2)] relative z-10 group no-underline text-white">
          <div className="w-10 h-10 bg-[var(--color-accent-green)] rounded-lg flex items-center justify-center text-black font-display font-black text-xl group-hover:rotate-12 transition-transform">T</div>
          <span className="font-display font-bold text-3xl tracking-tighter">Toddler</span>
        </Link>

        <div className="relative z-10 space-y-[var(--spacing-7)] mb-[var(--spacing-9)]">
          <div className="space-y-[var(--spacing-5)] fade-in-up">
            <h2 className="text-6xl font-display font-bold leading-[0.95] tracking-tighter max-w-sm">
              {mode === 'login' ? 'Continue your build.' : 'Start your journey into specialized AI.'}
            </h2>
            <p className="text-[#9A9A96] text-xl font-medium max-w-sm leading-relaxed">
              Domain experts are using Toddler to build proprietary tools without code.
            </p>
            <div className="space-y-[var(--spacing-4)] pt-[var(--spacing-5)]">
              {[
                "Synchronous training cycles",
                "100% data ownership",
                "Private by default"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-[var(--spacing-3)] text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
                  <Check size={16} className="text-[var(--color-accent-green)]" /> {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold uppercase tracking-[0.4em] text-white/10">
          Secure Workspace Protocol v1.0.4
        </div>
      </div>

      {/* Auth Form Side */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center p-[var(--spacing-6)] pt-[var(--spacing-9)] sm:p-[var(--spacing-9)] relative bg-[var(--color-bg-base)] overflow-y-auto">
        <div className="lg:hidden absolute top-10 left-8">
           <Link to="/" className="flex items-center gap-[var(--spacing-2)] no-underline text-white">
            <div className="w-9 h-9 bg-[var(--color-accent-green)] rounded-lg flex items-center justify-center text-black font-display font-black text-lg">T</div>
            <span className="font-display font-bold text-2xl tracking-tighter">Toddler</span>
          </Link>
        </div>

        <div className="max-w-[440px] w-full mx-auto space-y-[var(--spacing-9)]">
          <div className="space-y-[var(--spacing-3)]">
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter text-white leading-none">
              {mode === 'login' ? 'Sign in' : 'Create workspace'}
            </h1>
            <p className="text-[var(--color-text-muted)] text-xl font-medium">
              {mode === 'login' ? 'Access your private model gallery.' : 'Join the new era of non-technical AI building.'}
            </p>
          </div>

          <div className="space-y-[var(--spacing-8)]">
            {/* Social Authentication */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--spacing-4)]">
              <button 
                onClick={handleGoogle} 
                className="h-14 border border-[var(--color-border-subtle)] rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-[var(--spacing-3)] hover:bg-white/5 transition-all active:scale-95 cursor-pointer bg-transparent text-white"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale contrast-200" />
                Google
              </button>
              <button 
                className="h-14 border border-[var(--color-border-subtle)] rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-[var(--spacing-3)] hover:bg-white/5 transition-all active:scale-95 cursor-pointer bg-transparent text-white"
              >
                <img src="https://www.apple.com/favicon.ico" alt="Apple" className="w-4 h-4 grayscale contrast-200" />
                Apple ID
              </button>
            </div>

            <div className="relative flex items-center gap-[var(--spacing-5)] text-white/10 uppercase font-bold text-[10px] tracking-[0.4em]">
              <div className="h-px bg-current grow" />
              <span>or use email</span>
              <div className="h-px bg-current grow" />
            </div>

            {error && (
              <div className="p-[var(--spacing-5)] bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex gap-[var(--spacing-3)] items-center rounded-2xl animate-pulse">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-[var(--spacing-6)]">
              <div className="space-y-[var(--spacing-2)]">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Email address</label>
                <input 
                  type="email" required placeholder="e.g. hello@domain.com"
                  className="w-full h-16 px-[var(--spacing-6)] bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:bg-white/10 focus:border-[var(--color-accent-green)] transition-all font-medium text-white placeholder:text-white/10"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-[var(--spacing-2)]">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Password</label>
                  {mode === 'login' && <a href="#" className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-green)] no-underline hover:brightness-110">Forgot?</a>}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="••••••••••••"
                    className="w-full h-16 px-[var(--spacing-6)] bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:bg-white/10 focus:border-[var(--color-accent-green)] transition-all font-medium text-white placeholder:text-white/10"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button disabled={loading} type="submit" className="w-full h-16 !text-[15px]" variant="primary" loading={loading}>
                {mode === 'login' ? 'Sign in to Toddler' : 'Create free account'}
              </Button>
            </form>
          </div>

          <div className="pt-[var(--spacing-8)] border-t border-white/5 text-center space-y-[var(--spacing-6)]">
            <p className="text-[15px] font-medium text-[var(--color-text-muted)]">
              {mode === 'login' ? (
                <>New here? <Link to="/signup" className="text-[var(--color-accent-green)] font-bold no-underline hover:brightness-110 transition-all">Create workspace</Link></>
              ) : (
                <>Already a builder? <Link to="/login" className="text-[var(--color-accent-green)] font-bold no-underline hover:brightness-110 transition-all">Sign in here</Link></>
              )}
            </p>
            <div className="flex items-center justify-center gap-[var(--spacing-3)] text-[10px] font-bold uppercase tracking-[0.3em] text-white/10">
              <ShieldCheck size={16} className="text-[var(--color-accent-green)]" /> Protected by Toddler Security
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
