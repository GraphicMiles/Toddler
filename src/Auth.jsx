import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Auth = ({ mode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
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
    <div className="min-h-screen bg-toddler-off-white flex flex-col items-center justify-center p-6">
      <Link to="/" className="mb-12 flex items-center gap-2">
        <div className="w-8 h-8 bg-toddler-green rounded-sm flex items-center justify-center text-white font-display font-bold">T</div>
        <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
      </Link>
      
      <motion.div 
        className="w-full max-w-md bg-white p-8 border border-toddler-black/5 rounded-lg shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-display text-2xl font-bold mb-6 text-center">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        
        {error && <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">{error}</div>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-toddler-black/60 mb-1">Email address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 border border-toddler-black/10 rounded-sm focus:outline-none focus:border-toddler-green transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-toddler-black/60 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 border border-toddler-black/10 rounded-sm focus:outline-none focus:border-toddler-green transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="w-full bg-toddler-green text-white py-3 rounded-sm font-bold hover:opacity-90 transition-opacity">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        
        <div className="my-6 flex items-center gap-4 text-toddler-black/20">
          <div className="h-px bg-current flex-grow"></div>
          <span className="text-xs font-bold uppercase tracking-widest">or</span>
          <div className="h-px bg-current flex-grow"></div>
        </div>
        
        <button 
          onClick={handleGoogle}
          className="w-full border border-toddler-black/10 py-3 rounded-sm font-medium flex items-center justify-center gap-2 hover:bg-toddler-off-white transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
          Continue with Google
        </button>
        
        <p className="mt-8 text-center text-sm text-toddler-black/60">
          {mode === 'login' ? (
            <>Don't have an account? <Link to="/signup" className="text-toddler-green font-bold">Sign up</Link></>
          ) : (
            <>Already have an account? <Link to="/login" className="text-toddler-green font-bold">Log in</Link></>
          )}
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
