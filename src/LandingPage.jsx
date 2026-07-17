import React, { useState } from 'react';
import { ArrowRight, Check, Play, Menu, X, Database, Cpu, Shield, Layers, Zap, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* --- Internalized UI Components for 100% Build Stability --- */

const Container = ({ children, className = "", size = "default" }) => {
  const widths = { default: "max-w-[1200px]", prose: "max-w-[65ch]", wide: "max-w-[1400px]" };
  return <div className={`${widths[size]} mx-auto px-6 md:px-8 ${className}`}>{children}</div>;
};

const Button = ({ variant = 'primary', size = 'md', children, className = "", icon: Icon, loading = false, ...props }) => {
  const sizes = { sm: "px-5 py-2.5 text-[14px]", md: "px-6 py-4 text-[15px]", lg: "px-8 py-5 text-[17px]" };
  const variants = {
    primary: "bg-[var(--color-accent-lime)] text-[var(--color-accent-lime-fg)] glow-lime hover:brightness-110",
    secondary: "bg-[var(--color-accent-violet)] text-white glow-violet hover:brightness-110",
    outline: "bg-white/5 border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] backdrop-blur-md hover:border-[var(--color-accent-violet-soft)]",
    ghost: "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
  };
  return (
    <button className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition-all duration-300 disabled:opacity-30 cursor-pointer border-none relative overflow-hidden group ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading} {...props}>
      <span className="absolute top-0 left-[-60%] w-[40%] h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] transition-all duration-500 group-hover:left-[130%]" />
      {loading ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <>{children} {Icon && <Icon size={18} className="transition-transform group-hover:translate-x-0.5" />}</>}
    </button>
  );
};

const Card = ({ variant = 'surface', children, className = "", style = {} }) => {
  const variants = {
    surface: "bg-gradient-to-b from-white/5 to-white/[0.01] border border-[var(--color-border-subtle)] border-t-[var(--color-border-hairlight)] backdrop-blur-xl",
    dark: "bg-gradient-to-br from-[#2E1560] to-[#170B34] border border-[var(--color-accent-violet)]/40 border-t-[var(--color-accent-violet-soft)]/50 shadow-[0_30px_70px_-30px_rgba(125,57,235,.55)]",
    ownership: "bg-gradient-to-br from-[#1A0F35] to-[#0A0A0D] border border-[var(--color-border-subtle)]"
  };
  return <div className={`p-8 rounded-[18px] ${variants[variant]} ${className}`} style={style}>{children}</div>;
};

const Badge = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-2 px-4 py-2 border border-[var(--color-border-subtle)] rounded-full text-[13px] text-[var(--color-text-muted)] ${className}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-lime)] shadow-[0_0_8px_1px_rgba(198,255,51,0.8)]" />
    {children}
  </span>
);

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans selection:bg-[var(--color-accent-violet)] selection:text-white overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-[var(--color-bg-base)]/75 backdrop-blur-xl border-b border-[var(--color-border-subtle)] shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <Container className="h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-[17px] tracking-tight cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--color-accent-violet)] to-[var(--color-accent-lime)] flex items-center justify-center text-[#0A0A0D] text-sm">T</div>
            Toddler
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">How it works</a>
            <a href="#features" className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => navigate('/login')} className="hidden sm:block text-[14px] font-medium text-[var(--color-text-muted)] hover:text-white border-none bg-transparent cursor-pointer transition-colors">Log in</button>
            <Button onClick={() => navigate('/signup')} size="sm">Get started free</Button>
            <button className="lg:hidden p-2 border-none bg-transparent cursor-pointer text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </Container>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-bg-base)] pt-[var(--spacing-9)] px-[var(--spacing-6)] flex flex-col gap-[var(--spacing-7)] fade-in-up">
           <a href="#how-it-works" className="text-4xl font-display font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>How it works</a>
           <a href="#features" className="text-4xl font-display font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>Features</a>
           <a href="#pricing" className="text-4xl font-display font-bold no-underline" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
           <Button onClick={() => navigate('/signup')} className="w-full !py-[var(--spacing-6)] text-xl mt-auto mb-[var(--spacing-8)]">Get started free</Button>
        </div>
      )}

      <main>
        <section className="pt-[var(--spacing-8)] pb-0 px-6 text-center relative overflow-visible">
          <div className="orb orb-violet w-[520px] h-[520px] top-[-160px] left-[-160px]" />
          <div className="orb orb-lime w-[420px] h-[420px] top-0 right-[-140px] opacity-[0.35]" />
          <Container className="flex flex-col items-center">
            <Badge className="mb-[var(--spacing-6)] fade-in-up">V1.0 Now In Public Beta</Badge>
            <h1 className="font-display text-[40px] md:text-[76px] font-bold leading-[1.02] tracking-tighter mb-[var(--spacing-6)] max-w-prose-head fade-in-up">
              Turn your data into <span className="bg-gradient-to-r from-[var(--color-accent-violet-soft)] to-[var(--color-accent-lime)] bg-clip-text text-transparent">pure intelligence.</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-[var(--color-text-muted)] max-w-[46ch] mb-[var(--spacing-8)] leading-relaxed fade-in-up">Train, own, and deploy custom AI models without writing code. The toolkit for experts.</p>
            <div className="flex flex-col sm:flex-row gap-[var(--spacing-4)] mb-[var(--spacing-9)] fade-in-up">
              <Button onClick={() => navigate('/signup')} icon={ArrowRight}>Start Training Free</Button>
              <Button variant="outline" icon={Play}>Watch 2min Demo</Button>
            </div>
            <div className="w-full max-w-[960px] fade-in-up relative">
              <div className="bg-gradient-to-b from-[var(--color-bg-surface)] to-[var(--color-bg-surface-2)] border border-[var(--color-border-subtle)] border-t-[var(--color-border-hairlight)] rounded-[20px] overflow-hidden shadow-[0_50px_100px_-40px_rgba(125,57,235,0.5)]">
                <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.02] border-b border-[var(--color-border-subtle)]">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" /><div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" /><div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  <div className="ml-3 px-3 py-1 bg-white/[0.03] rounded-md text-[11.5px] font-mono text-[var(--color-text-muted-inverse)]">app.toddler.ai/train</div>
                </div>
                <div className="p-8 md:p-10 text-left">
                  <div className="grid md:grid-cols-[1.4fr_1fr] gap-5">
                    <div>
                      <div className="bg-white/[0.02] border border-[var(--color-border-subtle)] rounded-xl p-4 flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-[var(--color-accent-lime)]/15 text-[var(--color-accent-lime)] rounded-lg flex items-center justify-center font-bold text-xs">CSV</div>
                        <div className="text-sm font-semibold">Dataset_final.csv</div>
                      </div>
                      <div className="border border-[var(--color-border-subtle)] rounded-lg overflow-hidden opacity-30">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 border-b border-[var(--color-border-subtle)] last:border-none bg-white/[0.01]" />)}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-[var(--color-accent-violet)] to-[var(--color-accent-violet-deep)] rounded-xl p-5 text-center flex flex-col justify-center gap-3">
                      <span className="text-[11px] font-bold uppercase opacity-60">Accuracy</span>
                      <div className="text-4xl font-bold">98.4%</div>
                      <div className="w-10 h-10 mx-auto border-2 border-white/10 border-t-[var(--color-accent-lime)] rounded-full animate-spin" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 px-6 text-center">
          <Container>
            <h2 className="text-4xl font-bold mb-16">Engineered for quality.</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Dataset Sanitization", icon: <Database />, desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data." },
                { title: "Real-time Training", icon: <Cpu />, desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting." },
                { title: "Full Ownership", icon: <Shield />, desc: "Every model you train is yours — trained on your data, for your use case." },
                { title: "Cross-platform API", icon: <Globe />, desc: "Deploy models with a single click. Access them via a simple REST API or SDKs." },
                { title: "Playground", icon: <Play />, desc: "Test your models immediately in a human-friendly interface before deploying." },
                { title: "Optimization", icon: <Layers />, desc: "Uses reliable architecture optimized for specific datasets and small row counts." }
              ].map((f, i) => (
                <Card key={i} className="text-left group hover:border-[var(--color-accent-violet)] transition-all">
                  <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-[var(--color-accent-lime)] mb-8">{f.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                  <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">{f.desc}</p>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-white/5 border-y border-white/5">
          <Container className="text-center">
            <h2 className="text-4xl font-bold mb-16">Simple, honest pricing.</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
              <Card className="flex flex-col justify-between">
                <div>
                  <Badge>Standard</Badge>
                  <div className="text-5xl font-bold mt-6 mb-8">$0<span className="text-lg opacity-40">/ mo</span></div>
                  <ul className="space-y-4 list-none p-0">
                    {["1 Active Project", "Up to 2,000 Rows", "Playground Access"].map(f => <li key={f} className="flex gap-2 text-sm"><Check size={16} className="text-[var(--color-accent-lime)]" /> {f}</li>)}
                  </ul>
                </div>
                <Button variant="outline" className="w-full mt-12" onClick={() => navigate('/signup')}>Get Started</Button>
              </Card>
              <Card variant="dark">
                <Badge className="!bg-[var(--color-accent-lime)] !text-black !font-bold">PRO</Badge>
                <div className="text-5xl font-bold mt-6 mb-8">$49<span className="text-lg opacity-40">/ mo</span></div>
                <ul className="space-y-4 list-none p-0">
                  {["Unlimited Projects", "Up to 100k Rows", "API Access", "Export .pkl"].map(f => <li key={f} className="flex gap-2 text-sm text-white/60"><div className="w-1 h-1 rounded-full bg-white/20 mt-2" /> {f}</li>)}
                </ul>
                <Button variant="secondary" className="w-full mt-12">Join List</Button>
              </Card>
            </div>
          </Container>
        </section>
      </main>

      <footer className="bg-black py-20 px-6 text-center text-sm text-[var(--color-text-muted)]">
        <Container>
          <div className="font-display font-bold text-lg text-white mb-4">TODDLER AI</div>
          <p className="mb-8">Handcrafted for domain experts. Lagos, NG.</p>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between gap-4">
            <span>© 2026 Toddler AI</span>
            <div className="flex gap-6 justify-center">
               <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default LandingPage;
