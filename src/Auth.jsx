import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';

/* --- Internalized UI Components --- */

const Button = ({ variant = 'primary', size = 'md', children, className = "", icon: Icon, loading = false, ...props }) => {
  const sizes = { sm: "px-5 py-2.5 text-[14px]", md: "px-6 py-4 text-[15px]", lg: "px-8 py-5 text-[17px]" };
  const variants = {
    primary: "bg-[var(--color-accent-lime)] text-[var(--color-accent-lime-fg)] shadow-[0_0_20px_rgba(198,255,51,0.2)] hover:brightness-110",
    secondary: "bg-[var(--color-accent-violet)] text-white shadow-[0_0_20px_rgba(125,57,235,0.3)] hover:brightness-110",
    outline: "bg-white/5 border border-white/10 text-white backdrop-blur-md hover:border-white/20",
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-full font-bold uppercase tracking-widest transition-all duration-300 disabled:opacity-30 cursor-pointer border-none relative overflow-hidden group ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      <span className="absolute top-0 left-[-60%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] transition-all duration-500 group-hover:left-[130%]" />
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>{children} {Icon && <Icon size={18} />}</>}
    </button>
  );
};

/* --- Page Implementation --- */

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
      <div className="hidden lg:flex lg:w-5/12 bg-[var(--color-bg-dark)] relative p-20 flex-col justify-between overflow-hidden text-white border-r border-white/5">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        {/* Glowing Geometric Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-[120%] h-[120%] border border-[var(--color-accent-violet)]/30 rounded-full animate-[spin_100s_linear_infinite]" />
          <div className="absolute w-[80%] h-[80%] border border-[var(--color-accent-lime)]/20 rounded-full animate-[spin_60s_linear_reverse_infinite]" />
        </div>

        <Link to="/" className="flex items-center gap-2 relative z-10 group no-underline text-white">
          <div className="w-10 h-10 bg-[var(--color-accent-lime)] rounded-lg flex items-center justify-center text-black font-display font-black text-xl group-hover:rotate-12 transition-transform">T</div>
          <span className="font-display font-bold text-3xl tracking-tighter">Toddler</span>
        </Link>

        <div className="relative z-10 space-y-12 mb-12">
          <div className="space-y-6 fade-in-up">
            <h2 className="text-6xl font-display font-bold leading-[0.95] tracking-tighter max-w-sm">
              {mode === 'login' ? 'Continue your build.' : 'Start your journey into specialized AI.'}
            </h2>
            <p className="text-[#9A9A96] text-xl font-medium max-w-sm leading-relaxed">
              Domain experts are using Toddler to build proprietary tools without code.
            </p>
            <div className="space-y-4 pt-6">
              {["Synchronous training", "100% data ownership", "Private by default"].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
                  <Check size={16} className="text-[var(--color-accent-lime)]" /> {text}
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
      <div className="w-full lg:w-7/12 flex flex-col justify-center p-8 pt-24 sm:p-20 relative bg-[var(--color-bg-base)] overflow-y-auto">
        <div className="lg:hidden absolute top-10 left-8">
           <Link to="/" className="flex items-center gap-2 no-underline text-white">
            <div className="w-9 h-9 bg-[var(--color-accent-lime)] rounded-lg flex items-center justify-center text-black font-display font-black text-lg">T</div>
            <span className="font-display font-bold text-2xl tracking-tighter">Toddler</span>
          </Link>
        </div>

        <div className="max-w-[440px] w-full mx-auto space-y-10">
          <div className="space-y-4">
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tighter text-white leading-none">
              {mode === 'login' ? 'Sign in' : 'Create workspace'}
            </h1>
            <p className="text-[var(--color-text-muted)] text-xl font-medium">
              {mode === 'login' ? 'Access your private model gallery.' : 'Join the new era of non-technical AI building.'}
            </p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleGoogle} className="h-14 border border-white/10 rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-95 cursor-pointer bg-transparent text-white">
                Google
              </button>
              <button className="h-14 border border-white/10 rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-95 cursor-pointer bg-transparent text-white">
                Apple ID
              </button>
            </div>

            {error && (
              <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex gap-3 items-center rounded-2xl animate-pulse">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2 text-left">
                <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Email address</label>
                <input 
                  type="email" required placeholder="e.g. hello@domain.com"
                  className="w-full h-16 px-6 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:bg-white/10 focus:border-[var(--color-accent-lime)] transition-all font-medium text-white placeholder:text-white/10"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Password</label>
                  {mode === 'login' && <a href="#" className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-lime)] no-underline hover:brightness-110">Forgot?</a>}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="••••••••••••"
                    className="w-full h-16 px-6 bg-white/5 border border-white/5 rounded-2xl focus:outline-none focus:bg-white/10 focus:border-[var(--color-accent-lime)] transition-all font-medium text-white placeholder:text-white/10"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors border-none bg-transparent cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button disabled={loading} type="submit" className="w-full h-16 !text-[15px]" loading={loading}>
                {mode === 'login' ? 'Sign in to Toddler' : 'Create free account'}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm font-medium text-[var(--color-text-muted)]">
            {mode === 'login' ? (
              <>New here? <Link to="/signup" className="text-[var(--color-accent-lime)] font-bold no-underline hover:brightness-110">Create workspace</Link></>
            ) : (
              <>Already a builder? <Link to="/login" className="text-[var(--color-accent-lime)] font-bold no-underline hover:brightness-110">Sign in here</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
