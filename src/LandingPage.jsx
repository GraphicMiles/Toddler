import React, { useState } from 'react';
import { ArrowRight, Check, Shield, Zap, Info, Play, Plus, Menu, X, Globe, Database, Cpu, Smartphone, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  return (
    <div style={{ backgroundColor: '#FAFAF8', color: '#111111', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      {/* Navigation */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'rgba(250, 250, 248, 0.8)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E5E4E0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div style={{ width: '32px', height: '32px', backgroundColor: '#111111', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F5F3', fontWeight: 'bold', fontSize: '18px' }}>T</div>
              <span style={{ fontWeight: 'bold', fontSize: '20px', letterSpacing: '-0.025em' }}>Toddler</span>
            </div>
            <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <a href="#how-it-works" style={{ fontSize: '14px', fontWeight: 600, color: '#6B6B68', textDecoration: 'none' }}>How it works</a>
              <a href="#features" style={{ fontSize: '14px', fontWeight: 600, color: '#6B6B68', textDecoration: 'none' }}>Features</a>
              <a href="#pricing" style={{ fontSize: '14px', fontWeight: 600, color: '#6B6B68', textDecoration: 'none' }}>Pricing</a>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/login')} className="hidden sm:block" style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', color: '#111111' }}>
              Log in
            </button>
            <button 
              onClick={() => navigate('/signup')} 
              style={{ backgroundColor: '#111111', color: '#F5F5F3', padding: '12px 24px', borderRadius: '9999px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              Get started free
            </button>
            <button className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ paddingTop: '96px', paddingBottom: '96px', paddingLeft: '24px', paddingRight: '24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '32px', padding: '6px 16px', backgroundColor: 'white', border: '1px solid #E5E4E0', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6B6B68', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1B4332' }}></span>
            V1.0 Now In Public Beta
          </div>
          
          <h1 style={{ fontSize: '72px', fontWeight: 'bold', maxWidth: '20ch', marginBottom: '32px', lineHeight: 1.05, letterSpacing: '-0.05em' }}>
            Turn your data into <br /> pure intelligence.
          </h1>

          <p style={{ fontSize: '18px', color: '#6B6B68', maxWidth: '50ch', marginBottom: '48px', lineHeight: 1.6 }}>
            Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
          </p>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '96px', flexDirection: 'row' }}>
            <button 
              onClick={() => navigate('/signup')} 
              style={{ backgroundColor: '#111111', color: '#F5F5F3', padding: '16px 32px', borderRadius: '9999px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Start Training Free <ArrowRight size={18} />
            </button>
            <button style={{ backgroundColor: 'transparent', color: '#111111', padding: '16px 32px', borderRadius: '9999px', border: '2px solid #111111', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Watch 2min Demo <Play size={18} />
            </button>
          </div>

          {/* Hero Visual Mockup */}
          <div style={{ width: '100%', maxWidth: '1000px', background: 'white', border: '2px solid #111111', borderRadius: '16px', padding: '16px', boxSizing: 'border-box' }}>
            <div style={{ background: '#FAFAF8', border: '1px solid #E5E4E0', borderRadius: '12px', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px', boxSizing: 'border-box', textAlign: 'left', position: 'relative' }}>
               <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ height: '24px', width: '150px', background: 'rgba(0,0,0,0.05)', borderRadius: '12px' }}></div>
                    <div style={{ height: '40px', width: '120px', background: 'rgba(27, 67, 50, 0.1)', border: '1px solid rgba(27, 67, 50, 0.2)', borderRadius: '20px' }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '32px', flexGrow: 1 }}>
                    <div style={{ flexGrow: 2, background: 'white', border: '1px solid #E5E4E0', borderRadius: '12px', padding: '32px' }}>
                       <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '16px' }}>Dataset_final.csv</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {[1,2,3].map(i => <div key={i} style={{ height: '32px', width: '100%', background: '#FAFAF8', borderRadius: '4px', border: '1px solid #E5E4E0' }}></div>)}
                       </div>
                    </div>
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                       <div style={{ flexGrow: 1, background: '#111111', color: 'white', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.4 }}>Accuracy</span>
                          <span style={{ fontSize: '36px', fontWeight: 'bold' }}>98.4%</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" style={{ backgroundColor: 'white', padding: '96px 24px', borderTop: '1px solid #E5E4E0', borderBottom: '1px solid #E5E4E0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '48px', fontWeight: 'bold', textAlign: 'center', marginBottom: '64px', letterSpacing: '-0.025em' }}>Engineered for quality.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              { title: "Dataset Sanitization", desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data.", icon: Database },
              { title: "Real-time Training", desc: "Synchronous training cycles with live metric updates. No hidden queues.", icon: Cpu },
              { title: "Full Ownership", desc: "Every model you train is yours. Access the logic and keep your edge.", icon: Shield },
              { title: "Standard Architecture", desc: "Uses reliable TF-IDF + Logistic Regression optimized for smaller datasets.", icon: Layers },
              { title: "Interactive Playground", desc: "Test your models immediately in a human-friendly interface.", icon: Play },
              { title: "Clean Validation", desc: "Automatic 80/20 train-test splits with confusion matrices you can read.", icon: Check }
            ].map((f, i) => (
              <div key={i} style={{ padding: '48px', border: '1px solid #E5E4E0', borderRadius: '16px', textAlign: 'left' }}>
                <div style={{ width: '48px', height: '48px', background: '#FAFAF8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '48px' }}>
                  <f.icon size={24} />
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>{f.title}</h3>
                <p style={{ fontSize: '16px', color: '#6B6B68', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#0F1210', color: '#F5F5F3', padding: '128px 24px 48px 24px' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '64px', marginBottom: '96px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'black', fontWeight: 'bold', fontSize: '20px' }}>T</div>
                <span style={{ fontSize: '30px', fontWeight: 'bold', letterSpacing: '-0.025em' }}>Toddler</span>
              </div>
              <p style={{ opacity: 0.4, fontSize: '14px', maxWidth: '250px' }}>Built for experts who build the future. Proprietary intelligence for specific domains.</p>
            </div>
            {["Platform", "Company"].map(col => (
              <div key={col}>
                <h4 style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.2, marginBottom: '32px' }}>{col}</h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
                   <li><a href="#" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.6 }}>Overview</a></li>
                   <li><a href="#" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.6 }}>Privacy</a></li>
                   <li><a href="#" style={{ color: 'inherit', textDecoration: 'none', opacity: 0.6 }}>Terms</a></li>
                </ul>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: '48px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '10px', fontWeight: 'bold', opacity: 0.2, textTransform: 'uppercase', letterSpacing: '0.3em' }}>
            © 2026 TODDLER AI. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
