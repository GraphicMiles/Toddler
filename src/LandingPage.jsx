import React, { useState } from 'react';
import { ArrowRight, Check, Shield, Zap, Info, Play, Plus, Menu, X, Globe, Database, Cpu, Smartphone, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FadeIn } from './components/UI';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans selection:bg-[#111111] selection:text-[#F5F5F3]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/80 backdrop-blur-md border-b border-[#E5E4E0]">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 bg-[#111111] rounded-sm flex items-center justify-center text-[#F5F5F3] font-display font-bold">T</div>
              <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-semibold text-[#6B6B68] hover:text-[#111111] transition-colors">How it works</a>
              <a href="#features" className="text-sm font-semibold text-[#6B6B68] hover:text-[#111111] transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-semibold text-[#6B6B68] hover:text-[#111111] transition-colors">Pricing</a>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="hidden sm:block text-sm font-bold uppercase tracking-widest hover:opacity-60 transition-opacity px-4">
              Log in
            </button>
            <Button onClick={() => navigate('/signup')} className="hidden sm:flex !py-3 !px-6">
              Get started free
            </Button>
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#E5E4E0] px-6 py-8 flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <a href="#how-it-works" className="text-lg font-bold" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" className="text-lg font-bold" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className="text-lg font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <Button onClick={() => navigate('/signup')} className="w-full">Get started free</Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-24 md:pt-32 md:pb-48 px-6">
        <div className="max-w-[1400px] mx-auto text-center flex flex-col items-center">
          <FadeIn>
            <div className="mb-8 px-4 py-1.5 bg-white border border-[#E5E4E0] rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B68] inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332] animate-pulse" />
              V1.0 Now In Public Beta
            </div>
          </FadeIn>
          
          <FadeIn delay={100}>
            <h1 className="text-5xl md:text-7xl font-bold font-display max-w-[20ch] mb-8 leading-tight">
              Turn your data into <br className="hidden md:block" /> pure intelligence.
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-lg md:text-xl text-[#6B6B68] max-w-[50ch] mb-12">
              Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 mb-24">
              <Button onClick={() => navigate('/signup')} icon={ArrowRight}>Start Training Free</Button>
              <Button variant="outline" icon={Play}>Watch 2min Demo</Button>
            </div>
          </FadeIn>

          <FadeIn delay={400} className="w-full max-w-5xl relative">
            <div className="bg-white border-2 border-[#111111] rounded-2xl overflow-hidden p-2 md:p-4">
              <div className="bg-[#FAFAF8] rounded-xl border border-[#E5E4E0] aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 p-6 md:p-12 flex flex-col gap-6 md:gap-10 text-left">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-32 md:w-48 bg-black/5 rounded-full" />
                    <div className="h-10 w-32 bg-[#1B4332]/10 border border-[#1B4332]/20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-12 gap-8 flex-grow">
                    <div className="col-span-12 md:col-span-8 bg-white border border-[#E5E4E0] rounded-xl p-8 space-y-6">
                      <span className="text-sm font-bold">Dataset_final.csv</span>
                      <div className="space-y-3">
                        {[1,2,3].map(i => <div key={i} className="h-8 w-full bg-[#FAFAF8] rounded border border-[#E5E4E0]" />)}
                      </div>
                    </div>
                    <div className="hidden md:flex md:col-span-4 flex-col gap-6">
                      <div className="h-1/2 bg-black rounded-xl p-8 text-white flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold opacity-40">Accuracy</span>
                        <span className="text-4xl font-bold">98.4%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 bg-white border-y border-[#E5E4E0]">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-24">Engineered for quality.</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              { title: "Dataset Sanitization", tag: "DATA", desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data.", icon: Database },
              { title: "Real-time Training", tag: "ENGINE", desc: "Synchronous training cycles with live metric updates. No hidden queues.", icon: Cpu },
              { title: "Full Ownership", tag: "LEGAL", desc: "Every model you train is yours. Access the logic and keep your edge.", icon: Shield },
              { title: "Standard Architecture", tag: "ML", desc: "Uses reliable TF-IDF + Logistic Regression optimized for smaller datasets.", icon: Layers },
              { title: "Interactive Playground", tag: "TEST", desc: "Test your models immediately in a human-friendly interface.", icon: Play },
              { title: "Clean Validation", tag: "QA", desc: "Automatic 80/20 train-test splits with confusion matrices you can read.", icon: Check }
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 50}>
                <Card className="h-full border hover:border-black transition-colors">
                  <div className="w-12 h-12 bg-[#FAFAF8] rounded-xl flex items-center justify-center mb-12">
                    <f.icon size={24} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                  <p className="text-[#6B6B68] text-sm leading-relaxed">{f.desc}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-48 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn className="mb-24">
            <h2 className="text-4xl md:text-5xl font-bold font-display mb-6">Simple, human pricing.</h2>
            <p className="text-[#6B6B68]">No complicated tokens. Just build.</p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-8 items-stretch text-left">
            <FadeIn delay={100}>
              <Card className="h-full flex flex-col justify-between">
                <div className="space-y-8">
                  <span className="text-xs font-bold uppercase text-[#6B6B68]">Free Tier</span>
                  <div className="text-5xl font-bold">$0<span className="text-sm opacity-40 ml-2">/ month</span></div>
                  <ul className="space-y-4">
                    {["1 Active Project", "2,000 Rows per Upload", "Basic Playground"].map((t, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm"><Check size={16} className="text-[#1B4332]" /> {t}</li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" onClick={() => navigate('/signup')} className="mt-12 w-full">Get Started</Button>
              </Card>
            </FadeIn>
            <FadeIn delay={200}>
              <Card variant="dark" className="h-full flex flex-col justify-between">
                <div className="space-y-8">
                  <span className="text-xs font-bold uppercase opacity-40">Pro Plan</span>
                  <div className="text-5xl font-bold text-white">$49<span className="text-sm opacity-40 ml-2">/ month</span></div>
                  <ul className="space-y-4">
                    {["Unlimited Projects", "100k Rows per Upload", "API Deployment"].map((t, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm opacity-60"><span className="text-[#1B4332]">—</span> {t}</li>
                    ))}
                  </ul>
                </div>
                <Button variant="accent" className="mt-12 w-full">Join Waiting List</Button>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0F1210] text-[#F5F5F3] pt-32 pb-12 px-6 overflow-hidden">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-4 gap-16 mb-24">
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black font-bold">T</div>
                <span className="text-2xl font-bold">Toddler</span>
              </div>
              <p className="text-white/40 text-sm max-w-xs">Built for experts who build the future.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/20 mb-8">Platform</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-[#1B4332]">Overview</a></li>
                <li><a href="#" className="hover:text-[#1B4332]">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/20 mb-8">Company</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-[#1B4332]">About</a></li>
                <li><a href="#" className="hover:text-[#1B4332]">Privacy</a></li>
              </ul>
            </div>
            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/20 mb-8">Newsletter</h4>
              <form className="flex border-b border-white/10 pb-2">
                <input type="email" placeholder="name@domain.com" className="bg-transparent text-sm focus:outline-none grow" />
                <button className="font-bold text-xs uppercase hover:text-[#1B4332]">Join</button>
              </form>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            © 2026 TODDLER AI. DESIGNED BY HAND.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
