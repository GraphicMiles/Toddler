import React from 'react';
import { ArrowRight, Check, Play, Menu, X, Database, Cpu, Shield, Layers, Zap } from 'lucide-react';

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans selection:bg-text-primary selection:text-bg-base">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-bg-base/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-9 h-9 bg-text-primary rounded-lg flex items-center justify-center text-bg-base font-display font-bold text-xl">T</div>
              <span className="font-display font-bold text-2xl tracking-tighter">Toddler</span>
            </div>
            <div className="hidden lg:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">How it works</a>
              <a href="#features" className="text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button className="hidden sm:block text-sm font-bold uppercase tracking-widest hover:opacity-60 transition-opacity">Log in</button>
            <button className="bg-text-primary text-bg-base px-7 py-3 rounded-full font-bold text-sm border-2 border-text-primary hover:bg-transparent hover:text-text-primary transition-all">Get started free</button>
            <button className="lg:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-bg-base pt-24 px-6 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <a href="#how-it-works" className="text-3xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#features" className="text-3xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#pricing" className="text-3xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <button className="mt-8 bg-text-primary text-bg-base py-5 rounded-full font-bold text-xl">Get started free</button>
        </div>
      )}

      {/* Hero Section */}
      <header className="pt-24 pb-32 px-6">
        <div className="max-w-[1400px] mx-auto text-center flex flex-col items-center">
          <div className="mb-8 px-4 py-1.5 bg-white border border-border-subtle rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            V1.0 Now In Public Beta
          </div>
          <h1 className="font-display text-5xl md:text-8xl font-bold tracking-tighter mb-10 leading-[0.9] max-w-prose-head">
            Turn your data into pure intelligence.
          </h1>
          <p className="text-xl md:text-2xl text-text-muted max-w-[50ch] mb-12 leading-relaxed font-medium">
            Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-5 mb-32">
            <button className="bg-text-primary text-bg-base px-10 py-5 rounded-full font-bold text-lg flex items-center justify-center gap-3 border-2 border-text-primary hover:bg-transparent hover:text-text-primary transition-all group">
              Start Training Free <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="bg-white border-2 border-text-primary px-10 py-5 rounded-full font-bold text-lg flex items-center justify-center gap-3 hover:bg-bg-base transition-all">
              <Play size={20} fill="currentColor" /> Watch 2min Demo
            </button>
          </div>

          {/* Hero Visual Mockup */}
          <div className="w-full max-w-6xl bg-white border-2 border-text-primary rounded-3xl overflow-hidden p-3 md:p-5 relative">
            <div className="bg-bg-base rounded-2xl border border-border-subtle aspect-[16/9] flex items-center justify-center relative overflow-hidden p-8 md:p-16">
              <div className="w-full h-full flex flex-col gap-10 text-left">
                <div className="flex justify-between items-center">
                  <div className="h-7 w-48 bg-text-primary/5 rounded-full" />
                  <div className="h-10 w-32 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center text-[10px] font-bold text-accent tracking-widest px-4 uppercase">Connected</div>
                </div>
                <div className="grid grid-cols-12 gap-8 flex-grow">
                  <div className="col-span-12 md:col-span-8 bg-white border-2 border-text-primary/10 rounded-2xl p-8 space-y-8 flex flex-col">
                    <div className="flex justify-between items-center pb-4 border-b border-border-subtle">
                      <span className="font-bold text-lg">Customer_Reviews_2026.csv</span>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-accent flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Processing</span>
                    </div>
                    <div className="space-y-4 flex-grow">
                      {[1,2,3,4].map(i => <div key={i} className="h-10 w-full bg-bg-base rounded-xl border border-border-subtle" />)}
                    </div>
                  </div>
                  <div className="hidden md:flex md:col-span-4 flex-col gap-8">
                    <div className="h-1/2 bg-text-primary rounded-2xl p-8 text-bg-base flex flex-col justify-between border-2 border-text-primary">
                      <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-40">Accuracy</span>
                      <span className="text-6xl font-display font-bold">98.4%</span>
                    </div>
                    <div className="h-1/2 bg-accent rounded-2xl p-8 text-bg-base flex flex-col justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-40">Status</span>
                      <span className="text-3xl font-display font-bold">Model Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Absolute element - Floating Success Toast */}
            <div className="hidden lg:flex absolute bottom-12 right-12 bg-bg-dark text-bg-base p-5 rounded-2xl border border-white/10 items-center gap-5 shadow-2xl animate-in fade-in slide-in-from-right-8 duration-700 delay-1000 fill-mode-both">
              <div className="w-12 h-12 bg-accent text-accent-fg rounded-xl flex items-center justify-center">
                <Zap size={24} />
              </div>
              <div className="text-left pr-4">
                <div className="text-sm font-bold uppercase tracking-widest mb-1">Model Trained</div>
                <div className="text-xs opacity-50 font-medium">Success in 42.1 seconds</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Grid Features */}
      <section id="features" className="py-32 bg-white border-y border-border-subtle overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-24 space-y-4">
            <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter">Engineered for quality.</h2>
            <p className="text-lg text-text-muted max-w-[60ch] mx-auto leading-relaxed">No black boxes. We've built a full-stack engine designed to make machine learning reliable and accessible.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Dataset Sanitization", tag: "DATA", icon: Database, desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data so you don't have to." },
              { title: "Real-time Training", tag: "ENGINE", icon: Cpu, desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours." },
              { title: "Full Ownership", tag: "LEGAL", icon: Shield, desc: "Every model you train is yours. Access the underlying logic and keep your proprietary edge." },
              { title: "Standard Architecture", tag: "ML", icon: Layers, desc: "Uses reliable TF-IDF + Logistic Regression optimized for specific datasets and small row counts." },
              { title: "Interactive Playground", tag: "TEST", icon: Play, desc: "Test your models immediately in a human-friendly interface before using the results in production." },
              { title: "Clean Validation", tag: "QA", icon: Check, desc: "Automatic 80/20 train-test splits with confusion matrices you can actually read and trust." }
            ].map((f, i) => (
              <div key={i} className="bg-bg-base p-10 rounded-3xl border border-border-subtle hover:border-text-primary transition-all group cursor-default">
                <div className="flex justify-between items-start mb-12">
                  <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center border border-border-subtle group-hover:scale-110 transition-transform">
                    <f.icon className="text-text-primary" size={28} />
                  </div>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-text-muted border border-border-subtle px-3 py-1 rounded-full uppercase">{f.tag}</span>
                </div>
                <h3 className="font-display text-2xl font-bold mb-4">{f.title}</h3>
                <p className="text-text-muted leading-relaxed text-sm font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Card Section */}
      <section id="pricing" className="py-32 bg-bg-base">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-7xl font-bold tracking-tighter mb-8">Simple, human pricing.</h2>
          <p className="text-xl text-text-muted mb-24">No tokens or usage tiers. Just build.</p>
          <div className="grid md:grid-cols-2 max-w-5xl mx-auto gap-8 items-stretch text-left">
            <div className="bg-white p-12 rounded-[32px] border-2 border-text-primary flex flex-col justify-between">
              <div className="space-y-12">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-muted">Free Tier</span>
                  <div className="text-6xl font-display font-bold mt-4">$0<span className="text-xl text-text-muted ml-3">/ forever</span></div>
                </div>
                <ul className="space-y-5">
                  {["1 Active Project", "Up to 2,000 Rows per Upload", "Standard Scikit-learn Engine", "Basic Playground"].map(t => (
                    <li key={t} className="flex items-center gap-4 text-sm font-semibold text-text-primary">
                      <Check className="text-accent" size={18} /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="mt-16 w-full py-5 bg-text-primary text-bg-base rounded-full font-bold text-sm border-2 border-text-primary hover:bg-transparent hover:text-text-primary transition-all uppercase tracking-widest">Get Started</button>
            </div>
            <div className="bg-bg-dark p-12 rounded-[32px] border border-white/10 flex flex-col justify-between text-bg-base relative overflow-hidden">
              <div className="absolute top-8 right-8 bg-accent text-accent-fg px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Coming Soon</div>
              <div className="space-y-12">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-40">Pro Plan</span>
                  <div className="text-6xl font-display font-bold mt-4">$49<span className="text-xl opacity-40 ml-3">/ mo</span></div>
                </div>
                <ul className="space-y-5">
                  {["Unlimited Projects", "Up to 100k Rows per Upload", "Model Export (.pkl)", "API Deployment", "Advanced Metrics"].map(t => (
                    <li key={t} className="flex items-center gap-4 text-sm font-semibold opacity-60">
                      <span className="text-accent">—</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="mt-16 w-full py-5 bg-white text-bg-dark rounded-full font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all">Join Waiting List</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-dark text-bg-base py-32 px-6 overflow-hidden relative">
        {/* Large watermark wordmark */}
        <div className="absolute bottom-[-5%] left-0 text-[25vw] font-display font-black leading-none tracking-tighter opacity-[0.03] pointer-events-none select-none">TODDLER</div>
        <div className="max-w-[1400px] mx-auto grid md:grid-cols-4 gap-16 relative z-10">
          <div className="col-span-1 md:col-span-1 space-y-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-bg-dark font-bold text-xl">T</div>
              <span className="text-3xl font-bold tracking-tighter">Toddler</span>
            </div>
            <p className="text-bg-base/40 text-sm font-medium leading-relaxed max-w-[20ch]">The intelligence layer for experts who build the future.</p>
          </div>
          <div className="space-y-8">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-bg-base/20">Platform</h4>
            <ul className="space-y-4 text-sm font-bold opacity-60">
              <li><a href="#" className="hover:text-accent transition-colors">Overview</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Documentation</a></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-bg-base/20">Company</h4>
            <ul className="space-y-4 text-sm font-bold opacity-60">
              <li><a href="#" className="hover:text-accent transition-colors">About</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Terms</a></li>
            </ul>
          </div>
          <div className="space-y-8">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-bg-base/20">Newsletter</h4>
            <div className="flex border-b border-white/10 pb-4">
              <input type="email" placeholder="name@domain.com" className="bg-transparent focus:outline-none text-sm font-bold grow" />
              <button className="uppercase text-xs font-bold hover:text-accent transition-colors">Join</button>
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto mt-32 pt-8 border-t border-white/5 text-[10px] font-bold uppercase tracking-[0.4em] opacity-20 relative z-10">
          © 2026 TODDLER AI. DESIGNED BY HAND.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
