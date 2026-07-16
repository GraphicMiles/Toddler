import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from './components/UI';

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
      <div className="hidden lg:flex lg:w-5/12 bg-[#0F1210] relative p-20 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        <Link to="/" className="flex items-center gap-2 relative z-10 group">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-black font-display font-bold text-xl">T</div>
          <span className="font-display font-bold text-3xl tracking-tighter text-white">Toddler</span>
        </Link>

        <div className="relative z-10 space-y-12 mb-12">
          <div className="space-y-6">
            <h2 className="text-5xl md:text-6xl font-display font-bold text-white leading-tight tracking-tighter max-w-md">
              {mode === 'login' ? 'Turn spreadsheets into intelligence.' : 'Start building the AI you actually own.'}
            </h2>
            <p className="text-white/50 text-xl font-medium max-w-sm">
              Domain experts are using Toddler to build proprietary tools without code.
            </p>
            <div className="space-y-4">
              {[
                "Synchronous training cycles",
                "100% data ownership",
                "Private by default"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/30">
                  <Check size={14} className="text-[#1B4332]" /> {text}
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
        <div className="max-w-md w-full mx-auto space-y-10">
          <div className="space-y-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tighter text-black">
              {mode === 'login' ? 'Welcome back' : 'Create workspace'}
            </h1>
            <p className="text-[#6B6B68]">
              {mode === 'login' ? 'Enter your credentials to access your projects.' : 'Join the new era of non-technical AI building.'}
            </p>
          </div>

          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={handleGoogle} className="h-14 border border-[#E5E4E0] rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#FAFAF8]">
                Google
              </button>
              <button className="h-14 border border-[#E5E4E0] rounded-full font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-[#FAFAF8]">
                Apple ID
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl flex gap-3 items-center">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B68] ml-1">Email address</label>
                <input 
                  type="email" 
                  required
                  className="w-full h-16 px-6 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl focus:outline-none focus:bg-white focus:border-black transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B68] ml-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    className="w-full h-16 px-6 bg-[#FAFAF8] border border-[#E5E4E0] rounded-xl focus:outline-none focus:bg-white focus:border-black transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-black/20 hover:text-black">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button disabled={loading} type="submit" className="w-full h-16">
                {loading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Create workspace')}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm font-medium text-[#6B6B68]">
            {mode === 'login' ? (
              <>Don't have an account? <Link to="/signup" className="text-black font-bold">Sign up free</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-black font-bold">Sign in here</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
