import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Play, Menu, X, Database, Cpu, Shield, Layers, Zap, Plus, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Button = ({ variant = 'primary', children, style = {}, icon: Icon, ...props }) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    borderRadius: '999px',
    fontSize: '15px',
    fontWeight: '600',
    border: '1px solid transparent',
    transition: 'all 0.2s cubic-bezier(.16,.8,.24,1)',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  };
  
  const variants = {
    primary: { backgroundColor: '#111111', color: '#F5F5F3' },
    outline: { backgroundColor: 'transparent', color: '#111111', borderColor: '#E5E4E0' },
    accent: { backgroundColor: '#1B4332', color: '#F5F5F3' }
  };

  return (
    <button 
      style={{ ...baseStyle, ...variants[variant], ...style }} 
      onMouseOver={(e) => {
        if(variant === 'outline') e.currentTarget.style.borderColor = '#111111';
        if(variant === 'primary') e.currentTarget.style.backgroundColor = '#000';
      }}
      onMouseOut={(e) => {
        if(variant === 'outline') e.currentTarget.style.borderColor = '#E5E4E0';
        if(variant === 'primary') e.currentTarget.style.backgroundColor = '#111111';
      }}
      {...props}
    >
      {children}
      {Icon && <Icon size={18} />}
    </button>
  );
};

const Card = ({ children, className = "", delay = 0 }) => (
  <div 
    className={`bg-white border border-[#E5E4E0] rounded-[16px] p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {children}
  </div>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#111111] font-sans selection:bg-[#111111] selection:text-[#F5F5F3] overflow-x-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E5E4E0]">
        <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5 font-display font-bold text-[17px] tracking-tight cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-7 h-7 bg-[#111111] rounded-lg flex items-center justify-center text-[#F5F5F3] text-sm font-bold">T</div>
              Toddler
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-[#6B6B68] hover:text-[#111111] transition-colors">How it works</a>
              <a href="#features" className="text-sm font-medium text-[#6B6B68] hover:text-[#111111] transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium text-[#6B6B68] hover:text-[#111111] transition-colors">Pricing</a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="hidden sm:block text-sm font-semibold text-[#6B6B68] hover:text-[#111111] border-none bg-transparent cursor-pointer transition-colors">Log in</button>
            <Button onClick={() => navigate('/signup')} style={{ padding: '10px 20px', fontSize: '14px' }}>Get started free</Button>
            <button className="md:hidden p-2 border-none bg-transparent cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#FAFAF8] pt-24 px-6 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <a href="#how-it-works" className="text-3xl font-display font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>How it works</a>
          <a href="#features" className="text-3xl font-display font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#pricing" className="text-3xl font-display font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <Button onClick={() => navigate('/signup')} style={{ width: '100%', padding: '20px' }}>Get started free</Button>
        </div>
      )}

      <main>
        {/* Hero Section */}
        <section className="pt-16 pb-0 px-6 text-center">
          <div className="max-w-[1200px] mx-auto flex flex-col items-center">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex items-center gap-2 px-4 py-2 border border-[#E5E4E0] rounded-full text-[13px] font-medium text-[#6B6B68] mb-8 bg-white">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1B4332] animate-pulse" />
              V1.0 Now In Public Beta
            </div>
            
            <h1 className="font-display text-[44px] md:text-[72px] font-bold leading-[1.05] tracking-tighter mb-8 max-w-[18ch] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
              Turn your data into <span className="text-[#6B6B68]">pure intelligence.</span>
            </h1>

            <p className="text-lg md:text-[18px] text-[#6B6B68] max-w-[46ch] mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
              Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16 md:mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
              <Button onClick={() => navigate('/signup')} icon={ArrowRight}>Start Training Free</Button>
              <Button variant="outline" icon={Play}>Watch 2min Demo</Button>
            </div>

            {/* Hero Visual */}
            <div className="w-full max-w-[960px] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-400 fill-mode-both relative">
              <div className="bg-white border border-[#E5E4E0] rounded-[20px] p-6 md:p-10 text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,0.15)] relative">
                <div className="grid md:grid-cols-[1.4fr_1fr] gap-8">
                  <div className="space-y-6">
                    <div className="border border-[#E5E4E0] rounded-xl p-4 flex items-center gap-3">
                      <div className="w-9 h-9 bg-[#F2E9C9] text-[#8a6d1f] rounded-lg flex items-center justify-center text-[11px] font-bold">CSV</div>
                      <div className="flex-grow">
                        <div className="text-sm font-semibold">Dataset_final.csv</div>
                        <div className="text-[12px] text-[#6B6B68]">2,400 rows processed</div>
                      </div>
                    </div>
                    <div className="space-y-3 pt-2">
                      <div className="h-2.5 w-[85%] bg-[#E5E4E0] rounded-full" />
                      <div className="h-2.5 w-[65%] bg-[#E5E4E0] rounded-full" />
                      <div className="h-2.5 w-[75%] bg-[#E5E4E0] rounded-full" />
                    </div>
                  </div>
                  <div className="bg-[#111111] rounded-xl p-6 text-white flex flex-col justify-center text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Accuracy</span>
                    <div className="font-display text-[48px] md:text-[56px] font-bold leading-tight">98.4%</div>
                  </div>
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -bottom-5 right-6 md:right-10 bg-[#1B4332] text-white px-5 py-3.5 rounded-xl flex items-center gap-2.5 font-semibold text-sm shadow-[0_12px_24px_-8px_rgba(0,0,0,.35)] animate-in fade-in slide-in-from-right-4 duration-500 delay-[1200ms] fill-mode-both">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  Model Trained · Success in 42 sec
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 md:py-32 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[640px] mx-auto mb-16 space-y-4">
              <h2 className="font-display text-4xl md:text-[36px] font-bold tracking-tight">Engineered for quality.</h2>
              <p className="text-lg md:text-[18px] text-[#6B6B68] leading-relaxed">Toddler isn't just a wrapper. We've built a full-stack engine designed to make custom machine learning reliable and accessible.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: "Dataset Sanitization", icon: "◧", tag: "Data", desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data so you don't have to." },
                { title: "Real-time Training", icon: "◫", tag: "Engine", desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours." },
                { title: "Full Ownership", icon: "◨", tag: "Legal", desc: "Every model you train is yours — trained on your data, for your use case.", note: "Model export coming to Pro" },
                { title: "Cross-platform API", icon: "◪", tag: "API", desc: "Deploy models with a single click. Access them via a simple REST API or native SDKs.", note: "Coming to Pro" },
                { title: "Interactive Playground", icon: "▷", tag: "Test", desc: "Test your models immediately in a human-friendly interface before deploying to production." },
                { title: "Mobile Optimization", icon: "▤", tag: "UX", desc: "Monitor training and test predictions from any device with our optimized mobile dashboard." }
              ].map((f, i) => (
                <Card key={i} delay={i * 80}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-11 h-11 bg-[#F4F4F1] rounded-xl flex items-center justify-center text-[20px] text-[#1B4332]">{f.icon}</div>
                    <span className="text-[13px] font-medium uppercase tracking-wider text-[#6B6B68]">{f.tag}</span>
                  </div>
                  <h3 className="font-display text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-[#6B6B68] text-[15px] leading-relaxed">{f.desc}</p>
                  {f.note && <div className="text-[12px] font-semibold text-[#1B4332] mt-4">{f.note}</div>}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 px-6 border-t border-[#E5E4E0]">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="font-display text-3xl md:text-[36px] font-bold text-center mb-16">Train your model in three simple steps.</h2>
            <div className="max-w-[720px] mx-auto border-t border-[#E5E4E0]">
              {[
                { step: "01", title: "Upload & Map", desc: "Drop your CSV and select which columns contain your text and labels." },
                { step: "02", title: "Automated Training", desc: "Toddler optimizes the model architecture specifically for your data size." },
                { step: "03", title: "Validate & Ship", desc: "Check accuracy on held-out data before you rely on it. Model export is coming with Pro." }
              ].map((s, i) => (
                <div key={i} className="grid grid-cols-[56px_1fr] gap-6 py-8 border-b border-[#E5E4E0] items-start hover:bg-[#111111]/[0.01] transition-colors group">
                  <div className="font-display text-[22px] font-bold text-[#E5E4E0] group-hover:text-[#111111] transition-colors">{s.step}</div>
                  <div>
                    <h3 className="text-[18px] font-bold mb-2">{s.title}</h3>
                    <p className="text-[#6B6B68] text-[15px]">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Proof Section */}
        <section className="py-24 px-6">
          <div className="max-w-[1200px] mx-auto text-center">
            <h2 className="font-display text-3xl md:text-[36px] font-bold mb-4">Real runs, real numbers.</h2>
            <p className="text-[#6B6B68] text-lg mb-16">Internal benchmarks gatherered from early development runs.</p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { stat: "91%", desc: "500 product reviews → star rating, 38s" },
                { stat: "87%", desc: "1,200 tickets → category, 51s" },
                { stat: "94%", desc: "800 responses → sentiment, 29s" }
              ].map((p, i) => (
                <Card key={i} delay={i * 100} className="text-center">
                  <div className="font-display text-[48px] font-bold text-[#111111]">{p.stat}</div>
                  <div className="text-[14px] text-[#6B6B68] mt-2 max-w-[20ch] mx-auto">{p.desc}</div>
                </Card>
              ))}
            </div>
            <p className="text-[13px] text-[#6B6B68] mt-10 italic">These are internal test runs shown transparently — not user data.</p>
          </div>
        </section>

        {/* Ownership Section */}
        <section className="py-24 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="bg-[#0F1210] text-[#F5F5F3] rounded-[24px] p-12 md:p-20 text-center space-y-6">
              <h2 className="font-display text-4xl font-bold tracking-tight max-w-[16ch] mx-auto">You own what you build.</h2>
              <p className="text-[17px] text-[#9A9A96] max-w-[52ch] mx-auto leading-relaxed">Every model you train belongs to you, not a shared black box behind an API you don't control. Toddler exists so a domain expert can build something specific, keep the result, and not have to explain themselves to a platform to use it.</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 md:py-32 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-20 space-y-4">
              <h2 className="font-display text-4xl md:text-[36px] font-bold tracking-tight">Simple, honest pricing.</h2>
              <p className="text-lg text-[#6B6B68]">Build your first model for free. Upgrade as you scale.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 max-w-[1000px] mx-auto items-stretch">
              <div className="bg-white border border-[#E5E4E0] rounded-[20px] p-10 flex flex-col justify-between shadow-sm">
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#6B6B68]">Free Tier</span>
                  <div className="font-display text-[48px] font-bold mt-2">$0<span className="text-lg font-normal text-[#6B6B68] ml-1">/ mo</span></div>
                  <p className="text-sm text-[#6B6B68] mt-4">Perfect for individuals and small tests.</p>
                  <ul className="list-none p-0 my-10 space-y-4">
                    {["1 Active Project", "Up to 2,000 Rows", "Community Support", "Standard Training Speed"].map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium"><div className="w-5 h-5 bg-[#EFEFEC] rounded-full flex items-center justify-center text-[10px]">✓</div> {f}</li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" style={{ width: '100%' }}>Get Started</Button>
              </div>
              <div className="bg-[#0F1210] text-white rounded-[20px] p-10 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-10 right-10 bg-[#1B4332] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Coming Soon</div>
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-wider opacity-40">Pro Plan</span>
                  <div className="font-display text-[48px] font-bold mt-2">$49<span className="text-lg font-normal opacity-40 ml-1">/ mo</span></div>
                  <p className="text-sm opacity-60 mt-4">For production-scale models and advanced teams.</p>
                  <ul className="list-none p-0 my-10 space-y-4">
                    {["Unlimited Projects", "Up to 100k Rows", "API Deployment", "Model Export (.pkl)", "Priority Support", "Advanced Metrics"].map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium opacity-60"><div className="w-5 h-5 border border-white/10 rounded-full flex items-center justify-center text-[10px]">•</div> {f}</li>
                    ))}
                  </ul>
                  <p className="text-[12px] opacity-40 mb-6">Included at launch — join list for notifications.</p>
                </div>
                <Button variant="accent" style={{ width: '100%' }}>Join Waiting List</Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 px-6 border-t border-[#E5E4E0]">
          <div className="max-w-[720px] mx-auto">
            <h2 className="font-display text-3xl font-bold text-center mb-16">Questions, answered honestly.</h2>
            <div className="space-y-2">
              {[
                { q: "What file formats are supported?", a: "CSV only for v1. One text column and one label column — you pick which is which after upload." },
                { q: "Is my data secure?", a: "Yes — everything is encrypted end-to-end, both in transit and at rest using modern standards." },
                { q: "What happens after 2,000 rows?", a: "Uploads over the cap are rejected partway through with a clear message, ensuring fast training cycles for everyone." },
                { q: "Can I export my trained model?", a: "Not yet in v1 — model export (.pkl) is a Pro feature coming soon. We store all artifacts securely regardless." }
              ].map((faq, i) => (
                <div key={i} className="border-b border-[#E5E4E0]">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full py-6 flex justify-between items-center text-left border-none bg-transparent cursor-pointer group"
                  >
                    <span className="font-bold text-[16px] group-hover:text-[#1B4332] transition-colors">{faq.q}</span>
                    <div className={`transition-transform duration-300 text-xl font-light ${activeFaq === i ? 'rotate-45' : ''}`}>+</div>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${activeFaq === i ? 'max-h-40 pb-6' : 'max-h-0'}`}>
                    <p className="text-[#6B6B68] text-[15px] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 px-6 text-center">
          <div className="max-w-[1200px] mx-auto space-y-10">
            <h2 className="font-display text-4xl md:text-[40px] font-bold tracking-tight max-w-[16ch] mx-auto">Turn your data into pure intelligence.</h2>
            <Button onClick={() => navigate('/signup')} style={{ padding: '18px 40px' }} icon={ArrowRight}>Start Training Free</Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0F1210] text-[#F5F5F3] pt-24 pb-12 px-6 relative border-t-0 rounded-t-[32px] mt-12 overflow-hidden">
        <div className="absolute bottom-[-40px] left-0 right-0 text-center font-display font-bold text-[min(18vw,220px)] text-white/[0.035] select-none pointer-events-none uppercase">
          TODDLER
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
            <div className="space-y-6">
              <div className="logo flex items-center gap-2.5 font-display font-bold text-[17px] tracking-tight">
                <div className="w-7 h-7 bg-white text-black rounded-lg flex items-center justify-center text-sm font-bold">T</div>
                Toddler
              </div>
              <p className="text-sm text-[#9A9A96] leading-relaxed max-w-[32ch]">The intelligence layer for specific domain problems. Built for experts who build the future.</p>
              <div className="flex gap-4">
                {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer">◔</div>)}
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-8">Platform</h4>
              <div className="flex flex-col gap-4 text-sm font-medium">
                <a href="#" className="no-underline hover:opacity-60 transition-opacity">Overview</a>
                <a href="#" className="no-underline hover:opacity-60 transition-opacity">Integrations</a>
                <a href="#" className="no-underline hover:opacity-60 transition-opacity">Documentation</a>
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-8">Company</h4>
              <div className="flex flex-col gap-4 text-sm font-medium">
                <a href="#" className="no-underline hover:opacity-60 transition-opacity">About Us</a>
                <a href="#" className="no-underline hover:opacity-60 transition-opacity">Changelog</a>
                <a href="#" className="no-underline hover:opacity-60 transition-opacity">Privacy</a>
              </div>
            </div>
            <div>
              <h4 className="text-[12px] font-bold uppercase tracking-widest text-[#9A9A96] mb-8">Newsletter</h4>
              <p className="text-sm text-[#9A9A96] mb-6">Machine learning insights for builders.</p>
              <div className="flex">
                <input type="email" placeholder="name@email.com" className="flex-grow bg-transparent border border-white/10 rounded-l-full px-5 py-3 text-sm focus:outline-none focus:border-white/20" />
                <button className="bg-white text-black font-bold text-[12px] px-6 rounded-r-full uppercase tracking-widest">Join</button>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[13px] text-[#9A9A96]">
            <span>© 2026 Toddler AI. Designed by hand.</span>
            <div className="flex gap-8">
              <a href="#" className="no-underline hover:text-white transition-colors">Terms</a>
              <a href="#" className="no-underline hover:text-white transition-colors">Cookies</a>
              <a href="#" className="no-underline hover:text-white transition-colors">GDPR</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
