import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

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
    <div className="min-h-screen bg-white flex overflow-hidden">
      {/* Left Side: Visual/Branding - Ref f41d & 45cc */}
      <div className="hidden lg:flex lg:w-1/2 bg-toddler-black relative p-20 flex-col justify-between overflow-hidden">
        {/* Technical Grid Visual - Ref f41d & a281 */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        {/* Animated Lines - Replace "blob" circle */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            animate={{ 
              rotate: 360,
            }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="w-[800px] h-[800px] border border-white/10 rounded-full flex items-center justify-center"
          >
            <div className="w-[600px] h-[600px] border border-white/10 rounded-full flex items-center justify-center">
              <div className="w-[400px] h-[400px] border border-white/10 rounded-full" />
            </div>
          </motion.div>
        </div>

        <Link to="/" className="flex items-center gap-2 relative z-10 group">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-toddler-black font-display font-bold text-xl group-hover:scale-110 transition-transform">T</div>
          <span className="font-display font-bold text-3xl tracking-tighter text-white">Toddler</span>
        </Link>

        <div className="relative z-10 space-y-12">
          <div className="space-y-6">
            <h2 className="text-6xl font-display font-bold text-white leading-tight tracking-tighter">
              {mode === 'login' ? 'Welcome back to the future of intelligence.' : 'Start your journey into specialized AI.'}
            </h2>
            <p className="text-white/50 text-xl font-medium max-w-lg leading-relaxed">
              Domain experts are using Toddler to build proprietary intelligence without writing code.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {[
              "Synchronous training cycles",
              "100% data ownership",
              "Production-ready exports",
              "Military-grade security"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-4 text-sm font-bold uppercase tracking-widest text-white/30">
                <div className="w-6 h-6 bg-toddler-green text-white rounded-full flex items-center justify-center shrink-0">
                  <Check size={14} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
          TODDLER AI v1.0.4 · SYSTEM STABLE
        </div>
      </div>

      {/* Right Side: Auth Form - Ref f41d & 2225 */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-20 relative bg-white">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-10 left-8">
           <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-toddler-black rounded-lg flex items-center justify-center text-white font-display font-bold text-lg">T</div>
            <span className="font-display font-bold text-xl tracking-tighter">Toddler</span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto space-y-12">
          <div className="space-y-4">
            <h1 className="font-display text-5xl font-bold tracking-tighter">
              {mode === 'login' ? 'Log in' : 'Create account'}
            </h1>
            <p className="text-toddler-black/40 font-medium">
              {mode === 'login' ? 'Enter your credentials to access your workspace.' : 'Join the new era of non-technical AI building.'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold flex gap-3 items-center rounded-xl"
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleGoogle}
                className="h-16 border border-toddler-black/10 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-toddler-off-white transition-all active:scale-95"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale" />
                Google
              </button>
              <button 
                className="h-16 border border-toddler-black/10 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-toddler-off-white transition-all active:scale-95"
              >
                <img src="https://www.apple.com/favicon.ico" alt="Apple" className="w-4 h-4 grayscale" />
                Apple ID
              </button>
            </div>

            <div className="relative flex items-center gap-6 text-toddler-black/10 uppercase font-bold text-[10px] tracking-[0.4em]">
              <div className="h-px bg-current grow" />
              <span>or use email</span>
              <div className="h-px bg-current grow" />
            </div>

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-toddler-black/30 ml-1">Email address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. hello@domain.com"
                  className="w-full h-16 px-6 bg-toddler-off-white border border-toddler-black/5 rounded-xl focus:outline-none focus:bg-white focus:border-toddler-black/20 transition-all font-medium placeholder:text-toddler-black/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end ml-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-toddler-black/30">Password</label>
                  {mode === 'login' && <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-toddler-green hover:underline">Forgot?</a>}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="••••••••••••"
                    className="w-full h-16 px-6 bg-toddler-off-white border border-toddler-black/5 rounded-xl focus:outline-none focus:bg-white focus:border-toddler-black/20 transition-all font-medium placeholder:text-toddler-black/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-toddler-black/20 hover:text-toddler-black transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full h-16 bg-toddler-black text-white font-bold uppercase tracking-widest text-xs rounded-full hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  mode === 'login' ? 'Sign in to workspace' : 'Create free account'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm font-medium text-toddler-black/40">
            {mode === 'login' ? (
              <>Don't have an account? <Link to="/signup" className="text-toddler-black font-bold hover:text-toddler-green transition-colors">Sign up for free</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-toddler-black font-bold hover:text-toddler-green transition-colors">Sign in here</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
