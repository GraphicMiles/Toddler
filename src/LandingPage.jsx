import React, { useState } from 'react';
import { ArrowRight, Check, Play, Menu, X, Database, Cpu, Shield, Layers, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Card, Badge } from './components/UI';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const sections = {
    padding: "py-[var(--spacing-8)] md:py-[var(--spacing-9)]",
    headingGap: "mb-[var(--spacing-6)] md:mb-[var(--spacing-8)]"
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[var(--color-bg-base)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
        <Container wide className="h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-[var(--spacing-8)]">
            <div 
              className="flex items-center gap-[var(--spacing-2)] font-display font-bold text-[17px] tracking-tight cursor-pointer" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="w-8 h-8 bg-[var(--color-text-primary)] rounded-lg flex items-center justify-center text-[var(--color-text-inverse)] text-sm">T</div>
              Toddler
            </div>
            <div className="hidden lg:flex items-center gap-[var(--spacing-6)]">
              <a href="#how-it-works" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">How it works</a>
              <a href="#features" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-5)]">
            <button 
              onClick={() => navigate('/login')} 
              className="hidden sm:block text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors border-none bg-transparent cursor-pointer"
            >
              Log in
            </button>
            <Button onClick={() => navigate('/signup')} className="!py-[var(--spacing-3)] !px-[var(--spacing-5)]">Get started free</Button>
            <button className="lg:hidden p-[var(--spacing-2)] border-none bg-transparent cursor-pointer text-[var(--color-text-primary)]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </Container>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-[var(--color-bg-base)] pt-[var(--spacing-9)] px-[var(--spacing-6)] flex flex-col gap-[var(--spacing-6)] fade-in-up">
            <a href="#how-it-works" className="text-3xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" className="text-3xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" className="text-3xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <Button onClick={() => navigate('/signup')} className="w-full !py-[var(--spacing-5)] text-lg">Get started free</Button>
          </div>
        )}
      </AnimatePresence>

      <main>
        {/* Hero Section */}
        <section className="pt-[var(--spacing-8)] md:pt-[var(--spacing-9)] text-center">
          <Container className="flex flex-col items-center">
            <Badge className="mb-[var(--spacing-6)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
              V1.0 Now In Public Beta
            </Badge>
            
            <h1 className="font-display text-[48px] md:text-[80px] font-bold leading-[1.05] tracking-tighter mb-[var(--spacing-6)] max-w-prose-head fade-in-up">
              Turn your data into <span className="text-[var(--color-text-muted)]">pure intelligence.</span>
            </h1>

            <p className="body-lg text-[var(--color-text-muted)] max-w-[var(--width-prose)] mb-[var(--spacing-7)] fade-in-up" style={{ animationDelay: '100ms' }}>
              Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
            </p>

            <div className="flex flex-col sm:flex-row gap-[var(--spacing-4)] mb-[var(--spacing-9)] fade-in-up" style={{ animationDelay: '200ms' }}>
              <Button onClick={() => navigate('/signup')} icon={ArrowRight}>Start Training Free</Button>
              <Button variant="outline" icon={Play}>Watch 2min Demo</Button>
            </div>

            {/* Hero Visual Mockup */}
            <div className="w-full max-w-[1000px] fade-in-up" style={{ animationDelay: '300ms' }}>
              <div className="bg-white border-2 border-[var(--color-border-strong)] rounded-[var(--radius-xl)] p-[var(--spacing-3)] md:p-[var(--spacing-5)] relative overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)]">
                <div className="bg-[var(--color-bg-base)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] aspect-[16/9] p-[var(--spacing-6)] md:p-[var(--spacing-9)] text-left flex flex-col gap-[var(--spacing-8)]">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-48 bg-black/5 rounded-full" />
                    <div className="h-10 px-4 bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--color-accent)] tracking-widest uppercase">Engine Linked</div>
                  </div>
                  <div className="grid md:grid-cols-[1.4fr_1fr] gap-[var(--spacing-6)] flex-grow">
                    <div className="bg-white border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] p-[var(--spacing-6)] space-y-[var(--spacing-6)] flex flex-col">
                      <div className="flex justify-between items-center pb-[var(--spacing-4)] border-b border-[var(--color-border-subtle)]">
                        <span className="font-bold text-base">Customer_Reviews.csv</span>
                        <span className="text-[11px] font-bold text-[var(--color-accent)] animate-pulse uppercase tracking-widest">Active</span>
                      </div>
                      <div className="space-y-[var(--spacing-4)] flex-grow">
                        {[1,2,3,4].map(i => <div key={i} className="h-8 w-full bg-[var(--color-bg-base)] rounded-lg border border-[var(--color-border-subtle)]" />)}
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col gap-[var(--spacing-6)]">
                      <div className="h-1/2 bg-[var(--color-text-primary)] rounded-[var(--radius-lg)] p-[var(--spacing-6)] text-[var(--color-text-inverse)] flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Accuracy</span>
                        <span className="font-display text-5xl font-bold">98.4%</span>
                      </div>
                      <div className="h-1/2 bg-[var(--color-accent)] rounded-[var(--radius-lg)] p-[var(--spacing-6)] text-[var(--color-text-inverse)] flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">State</span>
                        <span className="text-2xl font-display font-bold">Deployed</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating Success Badge */}
                <div className="absolute bottom-[var(--spacing-6)] right-[var(--spacing-6)] bg-[var(--color-accent)] text-[var(--color-text-inverse)] px-[var(--spacing-5)] py-[var(--spacing-4)] rounded-[var(--radius-lg)] flex items-center gap-[var(--spacing-3)] font-semibold text-sm shadow-[0_20px_40px_-8px_rgba(0,0,0,0.3)] animate-bounce-slow">
                  <Zap size={20} fill="currentColor" />
                  Model Success · 42s
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Feature Grid */}
        <section id="features" className={`${sections.padding} bg-white border-y border-[var(--color-border-subtle)]`}>
          <Container>
            <div className="text-center max-w-[640px] mx-auto mb-[var(--spacing-9)]">
              <h2 className="font-display text-4xl font-bold tracking-tight mb-[var(--spacing-4)]">Engineered for quality.</h2>
              <p className="body-md text-[var(--color-text-muted)]">Toddler isn't just a wrapper. We've built a full-stack engine designed to make custom machine learning reliable and accessible.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-[var(--spacing-6)]">
              {[
                { title: "Dataset Sanitization", icon: "◧", tag: "Data", desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data so you don't have to." },
                { title: "Real-time Training", icon: "◫", tag: "Engine", desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours." },
                { title: "Full Ownership", icon: "◨", tag: "Legal", desc: "Every model you train is yours — trained on your data, for your use case.", note: "Model export available in Pro" },
                { title: "Standard Architecture", icon: "◪", tag: "ML", desc: "Uses reliable TF-IDF + Logistic Regression optimized for specific datasets and small row counts.", note: "Auto-ML included" },
                { title: "Interactive Playground", icon: "▷", tag: "Test", desc: "Test your models immediately in a human-friendly interface before deploying to production." },
                { title: "Mobile Optimization", icon: "▤", tag: "UX", desc: "Monitor training and test predictions from any device with our optimized mobile dashboard." }
              ].map((f, i) => (
                <Card key={i} className="flex flex-col group hover:border-[var(--color-border-strong)] transition-colors">
                  <div className="flex justify-between items-start mb-[var(--spacing-8)]">
                    <div className="w-12 h-12 bg-[var(--color-bg-base)] rounded-xl flex items-center justify-center text-[20px] text-[var(--color-accent)] group-hover:scale-110 transition-transform">{f.icon}</div>
                    <Badge>{f.tag}</Badge>
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-[var(--spacing-3)]">{f.title}</h3>
                  <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{f.desc}</p>
                  {f.note && <div className="text-[12px] font-bold text-[var(--color-accent)] mt-[var(--spacing-5)]">{f.note}</div>}
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section id="how-it-works" className={`${sections.padding} border-b border-[var(--color-border-subtle)]`}>
          <Container>
            <h2 className="font-display text-3xl md:text-[36px] font-bold text-center mb-[var(--spacing-9)]">Three simple steps.</h2>
            <div className="max-w-[720px] mx-auto border-t border-[var(--color-border-subtle)]">
              {[
                { step: "01", title: "Upload & Map", desc: "Drop your CSV and select which columns contain your text and labels." },
                { step: "02", title: "Automated Training", desc: "Toddler optimizes the model architecture specifically for your data size." },
                { step: "03", title: "Validate & Ship", desc: "Check accuracy on held-out data before you rely on it. Export when ready." }
              ].map((s, i) => (
                <div key={i} className="grid grid-cols-[56px_1fr] gap-[var(--spacing-6)] py-[var(--spacing-6)] border-b border-[var(--color-border-subtle)] items-start hover:bg-black/[0.01] transition-colors group">
                  <div className="font-display text-2xl font-bold text-[var(--color-border-subtle)] group-hover:text-[var(--color-text-primary)] transition-colors">{s.step}</div>
                  <div>
                    <h3 className="text-xl font-bold mb-[var(--spacing-1)]">{s.title}</h3>
                    <p className="text-[var(--color-text-muted)] text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Proof / Stats */}
        <section className={`${sections.padding} bg-white`}>
          <Container>
            <div className="text-center max-w-[640px] mx-auto mb-[var(--spacing-9)]">
              <h2 className="font-display text-3xl font-bold tracking-tight mb-[var(--spacing-4)]">Real runs, real numbers.</h2>
              <p className="body-md text-[var(--color-text-muted)]">Gathered from our latest engine benchmarks.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-[var(--spacing-6)]">
              {[
                { stat: "91%", desc: "500 reviews → star rating, 38s" },
                { stat: "87%", desc: "1,200 tickets → category, 51s" },
                { stat: "94%", desc: "800 responses → sentiment, 29s" }
              ].map((p, i) => (
                <Card key={i} className="text-center">
                  <div className="font-display text-5xl font-bold text-[var(--color-text-primary)] mb-[var(--spacing-2)]">{p.stat}</div>
                  <div className="text-sm text-[var(--color-text-muted)] font-medium max-w-[20ch] mx-auto">{p.desc}</div>
                </Card>
              ))}
            </div>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-[var(--spacing-7)] italic text-center">Internal development benchmarks, shown transparently.</p>
          </Container>
        </section>

        {/* Ownership Section */}
        <section className={`${sections.padding}`}>
          <Container>
            <div className="bg-[var(--color-bg-dark)] text-[var(--color-text-inverse)] rounded-[var(--radius-xl)] p-[var(--spacing-8)] md:p-[var(--spacing-9)] text-center">
              <h2 className="font-display text-4xl font-bold tracking-tight max-w-[16ch] mx-auto mb-[var(--spacing-5)]">You own what you build.</h2>
              <p className="text-lg text-[#9A9A96] max-w-[52ch] mx-auto leading-relaxed">
                Every model you train belongs to you, not a shared black box behind an API you don't control. Toddler exists so domain experts can build proprietary intelligence without permission.
              </p>
            </div>
          </Container>
        </section>

        {/* Pricing */}
        <section id="pricing" className={`${sections.padding} bg-white border-y border-[var(--color-border-subtle)]`}>
          <Container>
            <div className="text-center max-w-[640px] mx-auto mb-[var(--spacing-9)]">
              <h2 className="font-display text-4xl font-bold tracking-tight mb-[var(--spacing-4)]">Simple, honest pricing.</h2>
              <p className="body-md text-[var(--color-text-muted)]">Build your first model for free. Upgrade as you scale.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-[var(--spacing-8)] max-w-[1000px] mx-auto items-stretch">
              <div className="bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-[var(--radius-xl)] p-[var(--spacing-8)] flex flex-col justify-between">
                <div>
                  <span className="plan-label caption text-[var(--color-text-muted)]">Free Tier</span>
                  <div className="font-display text-5xl font-bold mt-[var(--spacing-3)]">$0<span className="text-lg font-normal text-[var(--color-text-muted)] ml-1">/ mo</span></div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-[var(--spacing-5)] mb-[var(--spacing-8)]">Perfect for individuals and validation tests.</p>
                  <ul className="space-y-[var(--spacing-4)] mb-[var(--spacing-8)]">
                    {["1 Active Project", "Up to 2,000 Rows", "Community Support", "Standard Training Speed"].map(f => (
                      <li key={f} className="flex items-center gap-[var(--spacing-3)] text-sm font-semibold">
                        <Check size={16} className="text-[var(--color-accent)]" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" className="w-full">Get Started</Button>
              </div>
              <div className="bg-[var(--color-bg-dark)] text-white rounded-[var(--radius-xl)] p-[var(--spacing-8)] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-[var(--spacing-8)] right-[var(--spacing-8)] bg-[var(--color-accent)] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Coming Soon</div>
                <div>
                  <span className="caption opacity-40">Pro Plan</span>
                  <div className="font-display text-5xl font-bold mt-[var(--spacing-3)]">$49<span className="text-lg font-normal opacity-40 ml-1">/ mo</span></div>
                  <p className="text-sm opacity-60 mt-[var(--spacing-5)] mb-[var(--spacing-8)]">For production-scale models and advanced teams.</p>
                  <ul className="space-y-[var(--spacing-4)] mb-[var(--spacing-8)]">
                    {["Unlimited Projects", "Up to 100k Rows", "API Deployment", "Model Export (.pkl)", "Priority Support"].map(f => (
                      <li key={f} className="flex items-center gap-[var(--spacing-3)] text-sm font-semibold opacity-60">
                        <span className="text-[var(--color-accent)]">—</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="accent" className="w-full">Join Waiting List</Button>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ */}
        <section className={`${sections.padding}`}>
          <Container size="prose">
            <h2 className="font-display text-3xl font-bold text-center mb-[var(--spacing-9)]">Questions, answered.</h2>
            <div className="space-y-[var(--spacing-2)]">
              {[
                { q: "What file formats are supported?", a: "CSV only for v1. One text column and one label column — you pick which is which after upload." },
                { q: "Is my data secure?", a: "Yes — everything is encrypted end-to-end, both in transit and at rest using modern standards." },
                { q: "What happens after 2,000 rows?", a: "Uploads over the cap are rejected partway through with a clear message, ensuring fast training cycles for everyone." },
                { q: "Can I export my trained model?", a: "Not yet in v1 — model export (.pkl) is a Pro feature coming soon. We store all artifacts securely regardless." }
              ].map((faq, i) => (
                <div key={i} className="border-b border-[var(--color-border-subtle)]">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full py-[var(--spacing-6)] flex justify-between items-center text-left border-none bg-transparent cursor-pointer group"
                  >
                    <span className="font-bold text-base group-hover:text-[var(--color-accent)] transition-colors">{faq.q}</span>
                    <div className={`transition-transform duration-300 text-xl font-light ${activeFaq === i ? 'rotate-45' : ''}`}>+</div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-40 pb-[var(--spacing-6)]' : 'max-h-0'}`}>
                    <p className="text-[var(--color-text-muted)] text-[15px] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="py-[var(--spacing-9)] text-center">
          <Container>
            <h2 className="font-display text-4xl font-bold tracking-tight max-w-prose-head mx-auto mb-[var(--spacing-8)]">Turn your data into pure intelligence.</h2>
            <Button onClick={() => navigate('/signup')} className="!py-[var(--spacing-5)] !px-[var(--spacing-8)] text-lg" icon={ArrowRight}>Start Training Free</Button>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-bg-dark)] text-[var(--color-text-inverse)] pt-[var(--spacing-9)] pb-[var(--spacing-7)] relative rounded-t-[32px] overflow-hidden">
        <div className="absolute bottom-[-40px] left-0 right-0 text-center font-display font-black text-[min(18vw,220px)] text-white/[0.03] select-none pointer-events-none">
          TODDLER
        </div>
        <Container wide className="relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--spacing-8)] mb-[var(--spacing-9)]">
            <div className="space-y-[var(--spacing-6)]">
              <div className="flex items-center gap-[var(--spacing-2)] font-display font-bold text-[17px] tracking-tight">
                <div className="w-8 h-8 bg-white text-black rounded-lg flex items-center justify-center text-sm font-bold">T</div>
                Toddler
              </div>
              <p className="text-sm text-[#9A9A96] leading-relaxed max-w-[30ch]">The intelligence layer for experts who build the future.</p>
              <div className="flex gap-[var(--spacing-4)]">
                {[1,2,3].map(i => <div key={i} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">◔</div>)}
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-[var(--spacing-6)]">Platform</h4>
              <div className="flex flex-col gap-[var(--spacing-4)] text-sm font-medium">
                <a href="#" className="no-underline hover:text-[var(--color-accent)] transition-colors">Overview</a>
                <a href="#" className="no-underline hover:text-[var(--color-accent)] transition-colors">Integrations</a>
                <a href="#" className="no-underline hover:text-[var(--color-accent)] transition-colors">Documentation</a>
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-[var(--spacing-6)]">Company</h4>
              <div className="flex flex-col gap-[var(--spacing-4)] text-sm font-medium">
                <a href="#" className="no-underline hover:text-[var(--color-accent)] transition-colors">About Us</a>
                <a href="#" className="no-underline hover:text-[var(--color-accent)] transition-colors">Changelog</a>
                <a href="#" className="no-underline hover:text-[var(--color-accent)] transition-colors">Privacy</a>
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-[var(--spacing-6)]">Newsletter</h4>
              <p className="text-sm text-[#9A9A96] mb-[var(--spacing-5)]">Machine learning insights for builders.</p>
              <div className="flex">
                <input type="email" placeholder="name@email.com" className="flex-grow bg-transparent border border-white/10 rounded-l-full px-[var(--spacing-5)] py-[var(--spacing-3)] text-sm focus:outline-none focus:border-white/30" />
                <button className="bg-white text-black font-bold text-[12px] px-[var(--spacing-6)] rounded-r-full uppercase tracking-widest">Join</button>
              </div>
            </div>
          </div>
          <div className="pt-[var(--spacing-6)] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-[var(--spacing-5)] text-[13px] text-[#9A9A96]">
            <span>© 2026 Toddler AI. Designed by hand.</span>
            <div className="flex gap-[var(--spacing-6)]">
              <a href="#" className="no-underline hover:text-white">Terms</a>
              <a href="#" className="no-underline hover:text-white">Cookies</a>
              <a href="#" className="no-underline hover:text-white">GDPR</a>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

// Add helper for AnimatePresence simulation if framer-motion is removed
const AnimatePresence = ({ children }) => <>{children}</>;

export default LandingPage;
