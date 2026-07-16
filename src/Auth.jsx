import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';

const Auth = ({ mode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      {/* Visual Side (Left) - Inspired by Ref 1 & 8 */}
      <div className="hidden lg:flex lg:w-1/2 bg-toddler-off-white relative items-center justify-center p-20 border-r border-toddler-black/5">
        <div className="absolute top-12 left-12">
           <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-toddler-black rounded-sm flex items-center justify-center text-white font-display font-bold">T</div>
            <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
          </Link>
        </div>

        <div className="max-w-md space-y-12">
          {/* Abstract Training Visual */}
          <div className="relative aspect-square w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 bg-toddler-black rounded-3xl overflow-hidden flex items-center justify-center"
            >
               {/* Pattern */}
               <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
               
               {/* Animated "Model" Box */}
               <motion.div 
                animate={{ 
                  rotate: [0, 90, 180, 270, 360],
                  borderRadius: ["10%", "50%", "10%", "50%", "10%"]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-40 h-40 border-4 border-toddler-green flex items-center justify-center relative z-10"
               >
                 <div className="w-4 h-4 bg-white animate-ping rounded-full" />
               </motion.div>
            </motion.div>
          </div>

          <div className="space-y-4">
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
              {mode === 'login' ? 'Turn your spreadsheets into intelligence.' : 'Start building the model you actually own.'}
            </h2>
            <p className="text-toddler-black/50 leading-relaxed font-medium">
              Join 12,000+ domain experts training specialized classifiers without writing a single line of code.
            </p>
          </div>

          <div className="space-y-4">
            {["Scikit-learn powered", "No usage limits", "Private by default"].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-toddler-black/30">
                <Check size={14} className="text-toddler-green" /> {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-12 md:p-24 relative">
        <div className="lg:hidden absolute top-8 left-8">
           <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-toddler-black rounded-sm flex items-center justify-center text-white font-display font-bold text-xs">T</div>
            <span className="font-display font-bold tracking-tight">Toddler</span>
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto space-y-10">
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight mb-2">
              {mode === 'login' ? 'Sign in' : 'Create an account'}
            </h1>
            <p className="text-toddler-black/40 font-medium">
              {mode === 'login' ? 'Welcome back to Toddler.' : 'Let’s get your workspace set up.'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex gap-3 items-center rounded-sm"
            >
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          <div className="space-y-6">
            <button 
              onClick={handleGoogle}
              className="w-full h-14 border border-toddler-black/10 rounded-sm font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-toddler-off-white transition-colors"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 grayscale" />
              Continue with Google
            </button>

            <div className="relative flex items-center gap-4 text-toddler-black/10 uppercase font-bold text-[10px] tracking-[0.3em]">
              <div className="h-px bg-current grow" />
              <span>or email</span>
              <div className="h-px bg-current grow" />
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-toddler-black/30 ml-1">Email address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  className="w-full h-14 px-5 border border-toddler-black/10 rounded-sm focus:outline-none focus:border-toddler-black transition-colors font-medium placeholder:text-toddler-black/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-toddler-black/30 ml-1">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full h-14 px-5 border border-toddler-black/10 rounded-sm focus:outline-none focus:border-toddler-black transition-colors font-medium placeholder:text-toddler-black/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button 
                disabled={loading}
                className="w-full h-14 bg-toddler-black text-white font-bold uppercase tracking-widest text-xs hover:bg-toddler-black/90 transition-all flex items-center justify-center"
              >
                {loading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Create Account')}
              </button>
            </form>
          </div>

          <p className="text-center text-sm font-medium text-toddler-black/40">
            {mode === 'login' ? (
              <>Don't have an account? <Link to="/signup" className="text-toddler-black font-bold hover:underline">Sign up for free</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-toddler-black font-bold hover:underline">Log in</Link></>
            )}
          </p>
        </div>

        {/* Legal Micro-copy */}
        <div className="absolute bottom-12 left-0 w-full text-center text-[10px] font-bold uppercase tracking-widest text-toddler-black/20">
          Secure by default · Toddler AI v1.0
        </div>
      </div>
    </div>
  );
};

export default Auth;
