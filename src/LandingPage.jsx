import React, { useState } from 'react';
import { ArrowRight, Check, Play, Menu, X, Database, Cpu, Shield, Layers, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Card, Badge } from './components/UI';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans overflow-x-hidden selection:bg-[var(--color-accent-purple)] selection:text-white">
      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[var(--color-bg-base)]/80 backdrop-blur-xl border-b border-[var(--color-border-subtle)]">
        <Container wide className="h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-[var(--spacing-9)]">
            <div 
              className="flex items-center gap-[var(--spacing-2)] font-display font-bold text-[19px] tracking-tighter cursor-pointer group" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-8 h-8 bg-[var(--color-accent-green)] rounded-lg flex items-center justify-center text-black font-black transition-transform group-hover:rotate-12">T</div>
              Toddler
            </div>
            <div className="hidden lg:flex items-center gap-[var(--spacing-7)]">
              <a href="#features" className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] transition-colors">Features</a>
              <a href="#how-it-works" className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] transition-colors">Process</a>
              <a href="#pricing" className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-6)]">
            <button 
              onClick={() => navigate('/login')} 
              className="hidden sm:block text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-white transition-colors border-none bg-transparent cursor-pointer"
            >
              Log in
            </button>
            <Button variant="primary" onClick={() => navigate('/signup')} size="sm" className="hidden sm:inline-flex">Start Building</Button>
            <button className="lg:hidden p-[var(--spacing-2)] border-none bg-transparent cursor-pointer text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </Container>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-bg-base)] pt-[var(--spacing-9)] px-[var(--spacing-8)] flex flex-col gap-[var(--spacing-7)] fade-in-up">
          <a href="#features" className="text-4xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#how-it-works" className="text-4xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Process</a>
          <a href="#pricing" className="text-4xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <Button onClick={() => navigate('/signup')} className="w-full !py-[var(--spacing-6)] text-xl mt-auto mb-[var(--spacing-8)]">Get started free</Button>
        </div>
      )}

      <main>
        {/* Hero Section - HackerRank Style */}
        <section className="pt-[var(--spacing-9)] pb-[var(--spacing-9)] md:pt-[var(--spacing-9)] overflow-hidden">
          <Container className="flex flex-col items-center">
            <Badge variant="purple" className="mb-[var(--spacing-7)] fade-in-up">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-purple)] animate-pulse" />
              Intelligence Reimagined
            </Badge>
            
            <h1 className="font-display text-[56px] md:text-[100px] font-bold leading-[0.9] tracking-tighter mb-[var(--spacing-7)] max-w-prose-head fade-in-up text-center">
              The future of AI is <span className="text-[var(--color-accent-green)] text-glow-green italic">human</span> + data.
            </h1>

            <p className="text-xl md:text-[22px] text-[var(--color-text-muted)] max-w-[38ch] mb-[var(--spacing-8)] fade-in-up text-center font-medium leading-relaxed" style={{ animationDelay: '100ms' }}>
              Train specialized classifiers, own your weights, and deploy custom intelligence in minutes. No code, just clean results.
            </p>

            <div className="flex flex-col sm:flex-row gap-[var(--spacing-4)] mb-[var(--spacing-9)] fade-in-up" style={{ animationDelay: '200ms' }}>
              <Button size="lg" onClick={() => navigate('/signup')} icon={ArrowRight}>Initialize Workspace</Button>
              <Button size="lg" variant="outline" icon={Play}>Watch the Engine</Button>
            </div>

            {/* Visual Engineering Mockup */}
            <div className="w-full max-w-[1100px] fade-in-up relative" style={{ animationDelay: '300ms' }}>
              {/* Background Glow */}
              <div className="absolute -inset-4 bg-[var(--color-accent-purple)]/10 blur-[100px] rounded-full" />
              
              <div className="bg-black border-2 border-[var(--color-accent-purple)] rounded-[var(--radius-xl)] p-[var(--spacing-2)] md:p-[var(--spacing-4)] relative overflow-hidden glow-purple">
                <div className="bg-[#0D0F14] rounded-[var(--radius-lg)] border border-white/5 aspect-[16/9] overflow-hidden flex flex-col">
                  {/* Mock UI Header */}
                  <div className="h-12 bg-white/5 flex items-center justify-between px-6 border-b border-white/5">
                    <div className="flex gap-2">
                       <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                       <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                       <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-30">toddler_v1_live_terminal</div>
                    <div className="w-12" />
                  </div>
                  
                  <div className="flex-grow p-8 flex flex-col md:flex-row gap-8">
                    <div className="flex-grow space-y-8">
                       <div className="p-6 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[var(--color-accent-green)]/20 text-[var(--color-accent-green)] rounded-xl flex items-center justify-center font-bold">CSV</div>
                            <div>
                               <div className="text-sm font-bold">Training_Data_Alpha.csv</div>
                               <div className="text-[10px] opacity-40 uppercase tracking-widest font-bold">8,420 entries verified</div>
                            </div>
                          </div>
                          <Zap className="text-[var(--color-accent-green)] animate-pulse" size={20} />
                       </div>
                       
                       <div className="space-y-4">
                          {[0.8, 0.6, 0.9].map((w, i) => (
                            <div key={i} className="h-2 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-[var(--color-accent-purple)]" style={{ width: `${w * 100}%` }} />
                            </div>
                          ))}
                       </div>
                    </div>
                    
                    <div className="md:w-64 flex flex-col gap-6">
                       <div className="flex-grow bg-[var(--color-accent-green)] text-black rounded-2xl p-6 flex flex-col justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest">Global Accuracy</span>
                          <span className="text-5xl font-display font-bold">99.2%</span>
                       </div>
                       <div className="h-32 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status</span>
                          <span className="text-lg font-bold text-[var(--color-accent-purple)]">Model Stable</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Features - Spacing Rule #2 */}
        <section id="features" className="py-[var(--spacing-9)] bg-[var(--color-bg-surface)] border-y border-[var(--color-border-subtle)]">
          <Container>
            <div className="flex flex-col lg:flex-row justify-between items-start gap-[var(--spacing-8)] mb-[var(--spacing-9)]">
              <div className="max-w-[500px] space-y-[var(--spacing-4)]">
                 <Badge variant="green">Engineering</Badge>
                 <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">Built for specific scale.</h2>
              </div>
              <p className="body-lg text-[var(--color-text-muted)] max-w-[400px]">
                Toddler handles the underlying ML complexity so you can focus on labeling and refining your domain intelligence.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-6)]">
              {[
                { title: "Dataset Sanitization", tag: "Process", desc: "Automatic handling of missing values, outliers, and encoding. We prepare your raw data for the engine.", icon: Database },
                { title: "Real-time Training", tag: "Engine", desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours.", icon: Cpu },
                { title: "Full Ownership", tag: "Legal", desc: "Every model you train is yours — trained on your proprietary data, for your specific use case.", icon: Shield },
                { title: "Intent Mapping", tag: "Interface", desc: "Easily map model outputs to custom chatbot responses or automated API actions.", icon: Layers },
                { title: "Precision Validation", tag: "Metrics", desc: "Detailed confusion matrices and feature importance scores you can actually read and trust.", icon: Zap },
                { title: "Direct Integration", tag: "API", desc: "Access your models via a high-performance REST API or download artifacts for offline use.", icon: Globe }
              ].map((f, i) => (
                <Card key={i} className="group hover:border-[var(--color-accent-purple)] transition-all duration-300">
                  <div className="flex justify-between items-start mb-[var(--spacing-8)]">
                    <div className="w-12 h-12 bg-[var(--color-bg-base)] border border-white/5 rounded-xl flex items-center justify-center text-[20px] text-[var(--color-accent-green)] group-hover:scale-110 transition-transform">
                       <f.icon size={24} />
                    </div>
                    <Badge variant="neutral">{f.tag}</Badge>
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-[var(--spacing-3)] tracking-tight">{f.title}</h3>
                  <p className="text-[var(--color-text-muted)] text-[15px] leading-relaxed font-medium">{f.desc}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-[var(--spacing-9)] bg-[var(--color-bg-base)]">
          <Container>
            <div className="text-center max-w-[640px] mx-auto mb-[var(--spacing-9)] space-y-[var(--spacing-4)]">
              <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight">Simple, honest pricing.</h2>
              <p className="text-lg text-[var(--color-text-muted)]">Zero tokens. Zero hidden usage tiers. Just build.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-[var(--spacing-8)] max-w-[1000px] mx-auto">
               <Card className="flex flex-col justify-between !bg-transparent border-2">
                  <div className="space-y-[var(--spacing-8)]">
                    <div>
                      <span className="caption text-[var(--color-text-muted)]">Standard Tier</span>
                      <div className="text-6xl font-display font-bold mt-4">$0<span className="text-xl text-[var(--color-text-muted)] ml-2">/ free</span></div>
                    </div>
                    <ul className="space-y-[var(--spacing-5)]">
                      {["1 Active Project", "Up to 2,000 Rows per Upload", "Standard Scikit-learn Engine", "Basic Playground Access"].map(f => (
                        <li key={f} className="flex items-center gap-[var(--spacing-4)] text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                           <Check size={18} className="text-[var(--color-accent-green)]" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" className="w-full mt-[var(--spacing-8)]">Get Started</Button>
               </Card>

               <Card variant="green" className="flex flex-col justify-between relative overflow-hidden !bg-black">
                  <div className="absolute top-10 right-10">
                    <Badge variant="purple">Limited Access</Badge>
                  </div>
                  <div className="space-y-[var(--spacing-8)]">
                    <div>
                      <span className="caption text-[var(--color-accent-green)]">Pro License</span>
                      <div className="text-6xl font-display font-bold mt-4 text-white">$49<span className="text-xl opacity-40 ml-2">/ month</span></div>
                    </div>
                    <ul className="space-y-[var(--spacing-5)]">
                      {["Unlimited Projects", "Up to 100k Rows per Upload", "Model Export (.pkl)", "Batch Inference Engine", "Priority Support"].map(f => (
                        <li key={f} className="flex items-center gap-[var(--spacing-4)] text-sm font-bold text-white uppercase tracking-widest">
                           <Check size={18} className="text-[var(--color-accent-green)]" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="primary" className="w-full mt-[var(--spacing-8)]">Join Waiting List</Button>
               </Card>
            </div>
          </Container>
        </section>

        {/* Footer */}
        <footer className="bg-[var(--color-bg-dark)] text-white pt-[var(--spacing-9)] pb-[var(--spacing-7)] rounded-t-[40px] relative overflow-hidden border-t border-white/5">
          <div className="absolute bottom-[-50px] left-0 right-0 text-center font-display font-black text-[20vw] text-white/[0.02] select-none pointer-events-none uppercase">
            TODDLER
          </div>
          
          <Container wide className="relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-8)] mb-[var(--spacing-9)]">
              <div className="space-y-[var(--spacing-7)]">
                <div className="flex items-center gap-[var(--spacing-2)] font-display font-bold text-[20px] tracking-tighter">
                  <div className="w-8 h-8 bg-[var(--color-accent-green)] rounded-lg flex items-center justify-center text-black font-black text-sm">T</div>
                  Toddler
                </div>
                <p className="text-sm text-[#9A9A96] leading-relaxed max-w-[30ch] font-medium">The specific intelligence layer for experts who build the future.</p>
                <div className="flex gap-[var(--spacing-4)]">
                   {[Twitter, Github, Youtube].map((Icon, i) => (
                     <div key={i} className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-[var(--color-text-muted)] hover:text-white">
                        <Icon size={16} />
                     </div>
                   ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-[var(--spacing-7)]">Platform</h4>
                <div className="flex flex-col gap-[var(--spacing-4)] text-[14px] font-semibold">
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Overview</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Integrations</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Documentation</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Security</a>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-[var(--spacing-7)]">Company</h4>
                <div className="flex flex-col gap-[var(--spacing-4)] text-[14px] font-semibold">
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">About Us</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Changelog</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Privacy</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-green)] no-underline transition-colors">Terms</a>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-[var(--spacing-7)]">Newsletter</h4>
                <p className="text-sm text-[#9A9A96] mb-[var(--spacing-6)]">Deep technical updates twice a month.</p>
                <div className="flex">
                  <input type="email" placeholder="email@address.com" className="flex-grow bg-white/5 border border-white/10 rounded-l-full px-5 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-green)]/30 text-white transition-colors" />
                  <button className="bg-white text-black font-bold text-[12px] px-6 rounded-r-full uppercase tracking-widest hover:bg-[var(--color-accent-green)] transition-colors">Join</button>
                </div>
              </div>
            </div>

            <div className="pt-[var(--spacing-7)] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-[var(--spacing-6)]">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/20">© 2026 Toddler AI. Handcrafted.</span>
              <div className="flex gap-[var(--spacing-7)] text-[11px] font-bold uppercase tracking-widest text-white/20">
                 <span>Status: Operational</span>
                 <span>Lagos, NG</span>
              </div>
            </div>
          </Container>
        </footer>
      </main>
    </div>
  );
};

// Helper for animations if motion is removed
const AnimatePresence = ({ children }) => <>{children}</>;

export default LandingPage;
