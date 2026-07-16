import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Check } from 'lucide-react';

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
    <div style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {/* Left Side */}
      <div className="hidden lg:flex" style={{ width: '40%', backgroundColor: '#0F1210', position: 'relative', padding: '80px', flexDirection: 'column', justifyContent: 'space-between', color: 'white' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', textDecoration: 'none', position: 'relative', zIndex: 10 }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: 'white', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '20px', borderRadius: '8px' }}>T</div>
          <span style={{ fontSize: '30px', fontWeight: 'bold', letterSpacing: '-0.025em' }}>Toddler</span>
        </Link>

        <div style={{ position: 'relative', zIndex: 10 }}>
          <h2 style={{ fontSize: '48px', fontWeight: 'bold', lineHeight: 1.1, marginBottom: '32px', letterSpacing: '-0.025em' }}>
            {mode === 'login' ? 'Turn spreadsheets into intelligence.' : 'Start building the AI you actually own.'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             {["Synchronous training", "100% data ownership", "Private by default"].map(t => (
               <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)' }}>
                 <Check size={16} color="#1B4332" /> {t}
               </div>
             ))}
          </div>
        </div>

        <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.4em', opacity: 0.2 }}>
          v1.0.4 Secure Workspace
        </div>
      </div>

      {/* Right Side */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px' }}>
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 'bold', letterSpacing: '-0.025em', marginBottom: '16px' }}>
            {mode === 'login' ? 'Sign in' : 'Create workspace'}
          </h1>
          <p style={{ color: '#6B6B68', marginBottom: '48px' }}>Join the new era of non-technical building.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <button 
              onClick={handleGoogle}
              style={{ width: '100%', height: '56px', backgroundColor: 'transparent', border: '1px solid #E5E4E0', borderRadius: '9999px', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              Continue with Google
            </button>

            {error && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', color: '#B91C1C', padding: '16px', borderRadius: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6B6B68' }}>Email</label>
                <input 
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  style={{ height: '56px', padding: '0 24px', backgroundColor: '#FAFAF8', border: '1px solid #E5E4E0', borderRadius: '12px', fontSize: '16px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6B6B68' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', height: '56px', padding: '0 24px', backgroundColor: '#FAFAF8', border: '1px solid #E5E4E0', borderRadius: '12px', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', opacity: 0.2 }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button 
                disabled={loading}
                style={{ height: '64px', backgroundColor: '#111111', color: 'white', borderRadius: '9999px', border: 'none', fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
              >
                {loading ? '...' : (mode === 'login' ? 'Sign in' : 'Start Free')}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B6B68' }}>
              {mode === 'login' ? (
                <>New here? <Link to="/signup" style={{ color: 'black', fontWeight: 'bold', textDecoration: 'none' }}>Create account</Link></>
              ) : (
                <>Have an account? <Link to="/login" style={{ color: 'black', fontWeight: 'bold', textDecoration: 'none' }}>Sign in</Link></>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
