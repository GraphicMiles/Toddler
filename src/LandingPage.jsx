import React, { useState } from 'react';
import { ArrowRight, Check, Play, Menu, X, Database, Cpu, Shield, Layers, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Card, Badge } from './components/UI';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans selection:bg-[var(--color-accent-violet)] selection:text-white overflow-x-hidden">
      
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-base)]/75 backdrop-blur-xl border-b border-[var(--color-border-subtle)] shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <Container className="h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-[var(--spacing-2)] font-display font-bold text-[17px] tracking-tight cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-accent-violet)] to-[var(--color-accent-lime)] flex items-center justify-center text-[#0A0A0D] text-sm">T</div>
            Toddler
          </div>
          <div className="hidden md:flex items-center gap-[var(--spacing-6)]">
            <a href="#how-it-works" className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">How it works</a>
            <a href="#features" className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-[var(--spacing-5)]">
            <button onClick={() => navigate('/login')} className="hidden sm:block text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white border-none bg-transparent cursor-pointer transition-colors">Log in</button>
            <Button onClick={() => navigate('/signup')} size="sm">Get started free</Button>
            <button className="md:hidden p-2 border-none bg-transparent cursor-pointer text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </Container>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-bg-base)] pt-[var(--spacing-9)] px-[var(--spacing-6)] flex flex-col gap-[var(--spacing-7)] fade-in-up">
           <a href="#how-it-works" className="text-4xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>How it works</a>
           <a href="#features" className="text-4xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Features</a>
           <a href="#pricing" className="text-4xl font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
           <Button onClick={() => navigate('/signup')} className="w-full !py-[var(--spacing-6)] text-xl mt-auto mb-[var(--spacing-8)]">Get started free</Button>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="pt-[var(--spacing-8)] pb-0 px-6 text-center relative overflow-visible">
          {/* Ambient Orbs */}
          <div className="orb orb-violet w-[520px] h-[520px] top-[-160px] left-[-160px]" />
          <div className="orb orb-lime w-[420px] h-[420px] top-0 right-[-140px] opacity-[0.35]" />
          
          <Container className="flex flex-col items-center">
            <Badge className="mb-[var(--spacing-6)] fade-in-up">V1.0 Now In Public Beta</Badge>
            
            <h1 className="font-display text-[40px] md:text-[76px] font-bold leading-[1.02] tracking-tighter mb-[var(--spacing-6)] max-w-prose-head fade-in-up" style={{ animationDelay: '100ms' }}>
              Turn your data into <span className="bg-gradient-to-r from-[var(--color-accent-violet-soft)] to-[var(--color-accent-lime)] bg-clip-text text-transparent">pure intelligence.</span>
            </h1>

            <p className="text-[16px] md:text-[18px] text-[var(--color-text-muted)] max-w-[46ch] mb-[var(--spacing-8)] leading-relaxed fade-in-up" style={{ animationDelay: '200ms' }}>
              Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
            </p>

            <div className="flex flex-col sm:flex-row gap-[var(--spacing-4)] mb-[var(--spacing-9)] fade-in-up" style={{ animationDelay: '300ms' }}>
              <Button onClick={() => navigate('/signup')} icon={ArrowRight}>Start Training Free</Button>
              <Button variant="outline" icon={Play}>Watch 2min Demo</Button>
            </div>

            {/* Hero Visual Mockup */}
            <div className="w-full max-w-[960px] fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="bg-gradient-to-b from-[var(--color-bg-surface)] to-[var(--color-bg-surface-2)] border border-[var(--color-border-subtle)] border-t-[var(--color-border-hairlight)] rounded-[20px] overflow-hidden shadow-[0_50px_100px_-40px_rgba(125,57,235,0.5)]">
                <div className="flex items-center gap-2 px-[18px] py-[14px] bg-white/[0.02] border-b border-[var(--color-border-subtle)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  <div className="ml-3 px-3 py-1 bg-white/[0.03] rounded-md text-[11.5px] font-mono text-[var(--color-text-muted-inverse)]">app.toddler.ai/train</div>
                </div>
                
                <div className="p-[28px] md:p-[32px_40px] text-left">
                  <div className="grid md:grid-cols-[1.4fr_1fr] gap-[20px]">
                    <div>
                      <div className="bg-white/[0.02] border border-[var(--color-border-subtle)] rounded-xl p-4 flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-[var(--color-accent-lime)]/15 text-[var(--color-accent-lime)] rounded-lg flex items-center justify-center text-[11px] font-bold">CSV</div>
                        <div>
                          <div className="text-[14px] font-semibold text-white">Dataset_final.csv</div>
                          <div className="text-[12px] text-[var(--color-text-muted)]">2,400 rows processed</div>
                        </div>
                      </div>
                      <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
                        {[1, 2, 3].map(i => (
                          <div key={i} className={`flex border-b border-[var(--color-border-subtle)] last:border-none ${i === 1 ? 'bg-white/[0.02]' : ''}`}>
                            <div className="p-2.5 border-r border-[var(--color-border-subtle)] text-[12px] text-[var(--color-text-muted)] flex-1">{i === 1 ? 'review_text' : '"Fast shipping, grea…'}</div>
                            <div className="p-2.5 flex-1">{i === 1 ? <span className="text-white font-semibold text-[12px]">label</span> : <span className="px-2 py-0.5 bg-[var(--color-accent-lime)]/15 text-[var(--color-accent-lime)] rounded text-[11px] font-bold">positive</span>}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-5">
                      <div className="bg-gradient-to-br from-[var(--color-accent-violet)] to-[var(--color-accent-violet-deep)] rounded-xl p-5 text-center glow-violet flex flex-col justify-center">
                        <span className="text-[11px] font-bold uppercase tracking-widest opacity-60">Accuracy</span>
                        <div className="font-display text-[34px] font-bold text-white mt-1 tracking-tight">98.4%</div>
                        <div className="w-12 h-12 mx-auto mt-3 border-2 border-white/15 border-t-[var(--color-accent-lime)] rounded-full animate-spin" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Activity Toast */}
              <div className="hidden md:flex absolute bottom-[-20px] right-6 bg-[var(--color-accent-lime)] text-[var(--color-accent-lime-fg)] px-4 py-3 rounded-xl items-center gap-2.5 font-bold text-sm glow-lime animate-in fade-in slide-in-from-right-4 duration-500 delay-1000 fill-mode-both">
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent-lime-fg)] flex-shrink-0" />
                Model Trained · Success in 42 sec
              </div>
            </div>
          </Container>
        </section>

        {/* Features Section */}
        <section id="features" className="py-[var(--spacing-9)]">
          <div className="orb orb-violet w-[600px] h-[600px] top-[-100px] right-[-260px] opacity-[0.28]" />
          <Container>
            <div className="text-center max-w-[640px] mx-auto mb-[var(--spacing-8)] space-y-[var(--spacing-4)]">
              <h2 className="font-display text-4xl font-bold tracking-tight">Engineered for quality.</h2>
              <p className="text-[18px] text-[var(--color-text-muted)]">Toddler isn't just a wrapper. We've built a full-stack engine designed to make machine learning reliable and accessible.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-col md:flex-row items-start md:items-center gap-7 !bg-gradient-to-r !from-[var(--color-accent-violet)]/15 !to-white/[0.02]">
                <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[var(--color-accent-violet)]/25 to-white/5 border border-[var(--color-accent-violet)]/25 flex items-center justify-center text-[var(--color-accent-violet-soft)] shrink-0">
                  <Database size={20} />
                </div>
                <div className="flex-grow">
                   <div className="flex justify-between items-start mb-2">
                      <h3 className="font-display text-xl font-bold">Dataset Sanitization</h3>
                      <Badge>DATA</Badge>
                   </div>
                   <p className="text-[var(--color-text-muted)] text-[14.5px] leading-relaxed">Automatic handling of missing values, outliers, and encoding. We prepare your data so you don't have to.</p>
                </div>
              </Card>
              {[
                { title: "Real-time Training", tag: "Engine", icon: Cpu, desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours." },
                { title: "Full Ownership", tag: "Legal", icon: Shield, desc: "Every model you train is yours — trained on your data, for your use case.", note: "Model export coming to Pro" },
                { title: "Cross-platform API", tag: "API", icon: Globe, desc: "Deploy models with a single click. Access them via a simple REST API or native SDKs.", note: "Coming to Pro" },
                { title: "Interactive Playground", tag: "Test", icon: Play, desc: "Test your models immediately in a human-friendly interface before deploying." },
                { title: "Mobile Optimization", tag: "UX", icon: Layers, desc: "Monitor training and test predictions from any device with our optimized mobile dashboard." }
              ].map((f, i) => (
                <Card key={i} className="col-span-1 md:col-span-2 group hover:border-[var(--color-accent-violet)]/40 transition-all duration-300">
                   <div className="flex justify-between items-start mb-6">
                      <div className="w-[42px] h-[42px] rounded-xl bg-gradient-to-br from-[var(--color-accent-violet)]/22 to-white/5 border border-[var(--color-accent-violet)]/25 flex items-center justify-center text-[var(--color-accent-violet-soft)]">
                         <f.icon size={20} />
                      </div>
                      <span className="text-[13px] font-medium uppercase text-[var(--color-text-muted)]">{f.tag}</span>
                   </div>
                   <h3 className="font-display text-[19px] font-bold mb-2.5">{f.title}</h3>
                   <p className="text-[var(--color-text-muted)] text-[14.5px] leading-relaxed">{f.desc}</p>
                   {f.note && <div className="inline-flex items-center gap-1.5 mt-3 text-[12px] font-semibold text-[var(--color-accent-lime)] tracking-tight">{f.note}</div>}
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Process Section */}
        <section id="how-it-works" className="py-[var(--spacing-9)] border-t border-[var(--color-border-subtle)]">
           <Container size="prose">
              <h2 className="font-display text-4xl font-bold text-center mb-[var(--spacing-9)] tracking-tight">Three simple steps.</h2>
              <div className="border-t border-[var(--color-border-subtle)]">
                {[
                  { num: "01", title: "Upload & Map", desc: "Drop your CSV and select which columns contain your text and labels." },
                  { num: "02", title: "Automated Training", desc: "Toddler optimizes the model architecture specifically for your data size." },
                  { num: "03", title: "Validate & Ship", desc: "Check accuracy on held-out data before you rely on it. Model export is coming with Pro." }
                ].map((s, i) => (
                  <div key={i} className="grid grid-cols-[56px_1fr] gap-5 py-6 border-b border-[var(--color-border-subtle)] items-start">
                    <div className="font-display text-[22px] font-bold text-[var(--color-accent-violet)]/35 leading-none mt-1">{s.num}</div>
                    <div>
                      <h3 className="text-[18px] font-bold mb-1.5 text-white">{s.title}</h3>
                      <p className="text-[var(--color-text-muted)] text-[15px] leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
           </Container>
        </section>

        {/* Ownership Section */}
        <section className="py-[var(--spacing-9)]">
           <Container>
              <Card variant="ownership" className="!p-[64px] md:!p-[96px] text-center relative overflow-hidden">
                <div className="orb orb-lime w-[400px] h-[400px] bottom-[-160px] left-[-160px] opacity-[0.18]" />
                <h2 className="font-display text-4xl font-bold mb-5 max-w-[16ch] mx-auto leading-tight relative z-10">You own what you build.</h2>
                <p className="text-[17px] text-[var(--color-text-muted)] max-w-[52ch] mx-auto leading-relaxed relative z-10">
                  Every model you train belongs to you, not a shared black box behind an API you don't control. Toddler exists so a domain expert can build something specific, keep the result, and not have to explain themselves to a platform to use it.
                </p>
              </Card>
           </Container>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-[var(--spacing-9)]">
           <div className="orb orb-violet w-[560px] h-[560px] top-[-120px] left-1/2 -translate-x-1/2 opacity-[0.25]" />
           <Container>
              <div className="text-center max-w-[640px] mx-auto mb-[var(--spacing-9)] space-y-[var(--spacing-4)]">
                 <h2 className="font-display text-4xl font-bold tracking-tight">Simple, honest pricing.</h2>
                 <p className="text-[18px] text-[var(--color-text-muted)]">Build your first model for free. Upgrade as you scale.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-[1000px] mx-auto items-stretch">
                <Card className="flex flex-col justify-between !p-10">
                  <div className="space-y-10">
                    <div>
                      <span className="caption text-[var(--color-text-muted)]">Free Tier</span>
                      <div className="font-display text-[48px] font-bold mt-2">$0<span className="text-lg font-normal text-[var(--color-text-muted)] ml-1">/ mo</span></div>
                      <p className="text-[14px] text-[var(--color-text-muted)] mt-4 leading-relaxed">Perfect for individuals and validation tests. No credit card required.</p>
                    </div>
                    <ul className="space-y-4 flex-grow">
                      {["1 Active Project", "Up to 2,000 Rows", "Community Support", "Standard Speed"].map(f => (
                        <li key={f} className="flex items-center gap-3 text-[14px] font-medium"><div className="w-5 h-5 rounded-full bg-[var(--color-accent-lime)]/15 text-[var(--color-accent-lime)] flex items-center justify-center text-[10px]">✓</div> {f}</li>
                      ))}
                    </ul>
                    <Button variant="outline" className="w-full">Get Started</Button>
                  </div>
                </Card>
                
                <Card variant="dark" className="flex flex-col justify-between !p-10 relative">
                  <div className="absolute top-10 right-10">
                    <Badge className="!bg-[var(--color-accent-lime)] !text-black !font-bold">Coming Soon</Badge>
                  </div>
                  <div className="space-y-10">
                    <div>
                      <span className="caption text-[var(--color-accent-violet-soft)]">Pro License</span>
                      <div className="font-display text-[48px] font-bold mt-2">$49<span className="text-lg font-normal text-[var(--color-text-muted-inverse)] ml-1">/ mo</span></div>
                      <p className="text-[14px] text-[#C9B8EE] mt-4 leading-relaxed">For production-scale models and advanced engineering teams.</p>
                    </div>
                    <ul className="space-y-4 flex-grow">
                      {["Unlimited Projects", "Up to 100k Rows", "API Deployment", "Model Export (.pkl)", "Priority Support"].map(f => (
                        <li key={f} className="flex items-center gap-3 text-[14px] font-medium opacity-60"><div className="w-5 h-5 rounded-full border border-[var(--color-accent-violet)]/40 text-[var(--color-accent-violet-soft)] flex items-center justify-center text-[10px]">•</div> {f}</li>
                      ))}
                    </ul>
                    <div className="text-[12px] text-[var(--color-text-muted-inverse)] mb-1">Included at launch — join list for notifications.</div>
                    <Button variant="secondary" className="w-full">Join Waiting List</Button>
                  </div>
                </Card>
              </div>
           </Container>
        </section>

        {/* Footer */}
        <footer className="bg-black py-[var(--spacing-9)] border-t border-[var(--color-border-subtle)] rounded-t-[32px] mt-[var(--spacing-9)]">
           <div className="footer-watermark">TODDLER</div>
           <Container className="relative z-10">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
               <div className="space-y-6">
                 <div className="flex items-center gap-2.5 font-display font-bold text-[17px] tracking-tight">
                   <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center text-sm font-bold">T</div>
                   Toddler
                 </div>
                 <p className="text-[14px] text-[var(--color-text-muted-inverse)] leading-relaxed max-w-[32ch]">The intelligence layer for specific domain problems. Built for experts who build the future.</p>
                 <div className="flex gap-4">
                   {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-text-muted-inverse)] hover:text-white transition-colors cursor-pointer opacity-50">◔</div>)}
                 </div>
               </div>
               
               <div>
                 <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted-inverse)] mb-6">Platform</h4>
                 <div className="flex flex-col gap-3.5 text-[14px] font-medium">
                   <a href="#" className="hover:text-[var(--color-accent-lime)] transition-colors">Overview</a>
                   <a href="#" className="hover:text-[var(--color-accent-lime)] transition-colors">Security</a>
                   <a href="#" className="hover:text-[var(--color-accent-lime)] transition-colors">Documentation</a>
                 </div>
               </div>

               <div>
                 <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted-inverse)] mb-6">Company</h4>
                 <div className="flex flex-col gap-3.5 text-[14px] font-medium">
                   <a href="#" className="hover:text-[var(--color-accent-lime)] transition-colors">About</a>
                   <a href="#" className="hover:text-[var(--color-accent-lime)] transition-colors">Privacy</a>
                   <a href="#" className="hover:text-[var(--color-accent-lime)] transition-colors">Terms</a>
                 </div>
               </div>

               <div className="space-y-6">
                 <h4 className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted-inverse)]">Subscribe</h4>
                 <div className="flex">
                    <input type="email" placeholder="name@email.com" className="flex-grow min-w-0 bg-transparent border border-white/10 rounded-l-full px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--color-accent-violet)]/40 transition-colors" />
                    <button className="bg-[var(--color-accent-lime)] text-black font-bold text-[13px] px-5 rounded-r-full hover:brightness-110">JOIN</button>
                 </div>
               </div>
             </div>
             
             <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[13px] text-[var(--color-text-muted-inverse)]">
                <span>© 2026 Toddler AI. Designed by hand.</span>
                <div className="flex gap-6">
                  <a href="#">Terms</a>
                  <a href="#">Cookies</a>
                  <a href="#">GDPR</a>
                </div>
             </div>
           </Container>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
