import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';

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
      <div className="hidden lg:flex lg:w-5/12 bg-bg-dark relative p-20 flex-col justify-between overflow-hidden text-white">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        <Link to="/" className="flex items-center gap-2 relative z-10 group no-underline text-white">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-bg-dark font-display font-bold text-xl group-hover:scale-110 transition-transform">T</div>
          <span className="font-display font-bold text-3xl tracking-tighter">Toddler</span>
        </Link>

        <div className="relative z-10 space-y-12">
          <div className="space-y-6">
            <h2 className="text-5xl md:text-6xl font-display font-bold leading-tight tracking-tighter max-w-md">
              {mode === 'login' ? 'Turn spreadsheets into intelligence.' : 'Start building the AI you actually own.'}
            </h2>
            <p className="text-white/50 text-xl font-medium max-w-sm">
              Domain experts are using Toddler to build proprietary tools without code.
            </p>
            <div className="space-y-4 pt-6">
              {[
                "Synchronous training cycles",
                "100% data ownership",
                "Private by default"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/30">
                  <Check size={14} className="text-accent" /> {text}
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
      <div className="w-full lg:w-7/12 flex flex-col justify-center p-8 sm:p-20 relative bg-white">
        <div className="lg:hidden absolute top-10 left-8">
           <Link to="/" className="flex items-center gap-2 no-underline text-text-primary">
            <div className="w-8 h-8 bg-text-primary rounded-lg flex items-center justify-center text-bg-base font-display font-bold text-lg">T</div>
            <span className="font-display font-bold text-xl tracking-tighter">Toddler</span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto space-y-10">
          <div className="space-y-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter">
              {mode === 'login' ? 'Welcome back' : 'Create workspace'}
            </h1>
            <p className="text-text-muted text-lg">
              {mode === 'login' ? 'Enter your credentials to access your projects.' : 'Join the new era of non-technical AI building.'}
            </p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleGoogle} className="h-14 border border-border-subtle rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-bg-base transition-all active:scale-95 cursor-pointer">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale" />
                Google
              </button>
              <button className="h-14 border border-border-subtle rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-bg-base transition-all active:scale-95 cursor-pointer">
                <img src="https://www.apple.com/favicon.ico" alt="Apple" className="w-4 h-4 grayscale" />
                Apple ID
              </button>
            </div>

            <div className="relative flex items-center gap-6 text-text-primary/10 uppercase font-bold text-[10px] tracking-[0.4em]">
              <div className="h-px bg-current grow" />
              <span>or email</span>
              <div className="h-px bg-current grow" />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex gap-3 items-center rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-text-muted ml-1">Email address</label>
                <input 
                  type="email" required placeholder="e.g. name@company.com"
                  className="w-full h-16 px-6 bg-bg-base border border-border-subtle rounded-xl focus:outline-none focus:bg-white focus:border-text-primary transition-all font-medium placeholder:text-text-primary/20"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-text-muted">Password</label>
                  {mode === 'login' && <a href="#" className="text-[11px] font-bold uppercase tracking-widest text-accent no-underline hover:underline">Forgot?</a>}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="••••••••••••"
                    className="w-full h-16 px-6 bg-bg-base border border-border-subtle rounded-xl focus:outline-none focus:bg-white focus:border-text-primary transition-all font-medium placeholder:text-text-primary/20"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-text-primary/20 hover:text-text-primary transition-colors border-none bg-transparent cursor-pointer">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button 
                disabled={loading} type="submit"
                className="w-full h-16 bg-text-primary text-bg-base font-bold uppercase tracking-widest text-xs rounded-full border-2 border-text-primary hover:bg-transparent hover:text-text-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                {loading ? '...' : (mode === 'login' ? 'Sign in' : 'Create workspace')}
              </button>
            </form>
          </div>

          <div className="pt-8 border-t border-border-subtle text-center space-y-6">
            <p className="text-sm font-medium text-text-muted">
              {mode === 'login' ? (
                <>Don't have an account? <Link to="/signup" className="text-text-primary font-bold no-underline hover:text-accent transition-colors">Sign up free</Link></>
              ) : (
                <>Already have an account? <Link to="/login" className="text-text-primary font-bold no-underline hover:text-accent transition-colors">Sign in here</Link></>
              )}
            </p>
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-primary/20">
              <ShieldCheck size={14} /> Encrypted End-to-End
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
