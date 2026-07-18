import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { useNavigate, Link } from 'react-router-dom';

const Auth = ({ mode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (loading) return;
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
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result.credential?.idToken;
        if (!idToken) throw new Error('Google did not return an ID token. Check Android Firebase configuration.');
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
      } else {
        await signInWithPopup(auth, googleProvider);
      }
      navigate('/dashboard');
    } catch (err) {
      // Ignore user cancellations to prevent confusing red error boxes
      if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)] font-sans">
      <div className="hidden md:flex md:w-1/2 p-12 lg:p-24 flex-col justify-between border-r border-[var(--line)] relative bg-[var(--surface)]">
        <div className="relative z-10">
          <Link to="/" className="logo cursor-pointer inline-flex items-center gap-2 font-bold mb-16 no-underline text-white">
            <span className="logo-mark"></span>TODDLER
          </Link>
          <div className="eyebrow"><span className="dot"></span>Secure Workspace</div>
          <h2 className="text-4xl lg:text-5xl font-display font-bold leading-tight mt-6 max-w-sm text-white">
            {mode === 'login' ? 'Continue your build.' : 'Start your journey into specialized AI.'}
          </h2>
          <p className="mt-6 text-[var(--text-dim)] text-lg max-w-sm leading-relaxed">
            Train, own, and deploy custom AI models without writing code. Handcrafted for domain experts.
          </p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-[var(--bg)] min-h-screen relative">
        <div className="md:hidden absolute top-6 left-6">
          <Link to="/" className="logo cursor-pointer inline-flex items-center gap-2 font-bold no-underline text-white">
            <span className="logo-mark"></span>TODDLER
          </Link>
        </div>

        <div className="max-w-[400px] w-full mx-auto mt-12 md:mt-0">
          <h1 className="text-3xl font-display font-bold mb-2 text-white">
            {mode === 'login' ? 'Sign in to Toddler' : 'Create your workspace'}
          </h1>
          <p className="text-[var(--text-dim)] mb-8 text-sm">
            {mode === 'login' ? 'Welcome back. Enter your credentials to access your models.' : 'No credit card required. Free tier forever.'}
          </p>

          <button type="button" disabled={loading} onClick={handleGoogle} className="w-full mb-6 flex items-center justify-center gap-3 py-3.5 border border-[var(--line)] text-[var(--text)] font-mono text-[12.5px] uppercase tracking-widest hover:bg-[var(--text)] hover:text-[#14130F] transition-colors disabled:opacity-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-[var(--line)] flex-1"></div>
            <span className="text-[10px] font-mono text-[var(--text-faint)] uppercase tracking-widest">or email</span>
            <div className="h-px bg-[var(--line)] flex-1"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 border border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)] text-sm font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="input-label">Email Address</label>
              <input 
                type="email" required placeholder="you@company.com"
                className="input-field"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input 
                type="password" required placeholder="••••••••"
                className="input-field"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button disabled={loading} type="submit" className="btn btn-solid w-full mt-4">
              {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[var(--text-dim)]">
            {mode === 'login' ? (
              <>New to Toddler? <Link to="/signup" className="text-[var(--accent-lime)] underline">Sign up</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-[var(--accent-lime)] underline">Log in</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
