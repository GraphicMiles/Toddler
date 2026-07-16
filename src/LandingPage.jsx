import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, Shield, Zap, Info, Play, Plus, Menu, X, Globe, Database, Cpu, Smartphone, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, Card, FadeIn } from './components/UI';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans selection:bg-text-primary selection:text-text-primary-inverse">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-bg-base/80 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-8 h-8 bg-text-primary rounded-sm flex items-center justify-center text-text-primary-inverse font-display font-bold">T</div>
              <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">How it works</a>
              <a href="#features" className="text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-semibold text-text-muted hover:text-text-primary transition-colors">Pricing</a>
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
        
        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-border-subtle overflow-hidden"
            >
              <div className="px-6 py-8 flex flex-col gap-6">
                <a href="#how-it-works" className="text-lg font-display font-bold" onClick={() => setMobileMenuOpen(false)}>How it works</a>
                <a href="#features" className="text-lg font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Features</a>
                <a href="#pricing" className="text-lg font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                <Button onClick={() => navigate('/signup')} className="w-full">Get started free</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-24 md:pt-32 md:pb-48 px-6">
        <div className="max-w-[1400px] mx-auto text-center flex flex-col items-center">
          <FadeIn>
            <div className="mb-8 px-4 py-1.5 bg-white border border-border-subtle rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-text-muted inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              V1.0 Now In Public Beta
            </div>
          </FadeIn>
          
          <FadeIn delay={100}>
            <h1 className="display-hero max-w-[20ch] mb-8">
              Turn your data into <br className="hidden md:block" /> pure intelligence.
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="body-lg text-text-muted max-w-[50ch] mb-12">
              Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 mb-24">
              <Button onClick={() => navigate('/signup')} icon={ArrowRight}>Start Training Free</Button>
              <Button variant="outline" icon={Play}>Watch 2min Demo</Button>
            </div>
          </FadeIn>

          {/* Hero Visual */}
          <FadeIn delay={400} className="w-full max-w-5xl relative">
            <div className="bg-white border-2 border-text-primary rounded-2xl overflow-hidden p-2 md:p-4">
              <div className="bg-bg-base rounded-xl border border-border-subtle aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                {/* Simulated UI */}
                <div className="absolute inset-0 p-6 md:p-12 flex flex-col gap-6 md:gap-10 text-left">
                  <div className="flex justify-between items-center">
                    <div className="h-6 w-32 md:w-48 bg-text-primary/5 rounded-full" />
                    <div className="flex gap-2 md:gap-4">
                      <div className="h-8 md:h-10 w-24 md:w-32 bg-accent/10 border border-accent/20 rounded-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4 md:gap-8 flex-grow">
                    <div className="col-span-12 md:col-span-8 bg-white border border-border-subtle rounded-xl p-4 md:p-8 space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold">Dataset_final.csv</span>
                        <span className="caption text-accent">Uploaded</span>
                      </div>
                      <div className="space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-8 w-full bg-bg-base rounded border border-border-subtle" />
                        ))}
                      </div>
                    </div>
                    <div className="hidden md:flex md:col-span-4 flex-col gap-6">
                      <div className="h-1/2 bg-text-primary rounded-xl p-8 text-text-primary-inverse flex flex-col justify-between">
                        <span className="caption opacity-40">Accuracy</span>
                        <span className="text-4xl font-display font-bold">98.4%</span>
                      </div>
                      <div className="h-1/2 bg-accent rounded-xl p-8 text-text-primary-inverse flex flex-col justify-between">
                        <span className="caption opacity-40">Status</span>
                        <span className="text-2xl font-display font-bold">Ready</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Activity Card */}
                <motion.div 
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.5, duration: 0.5, ease: "easeOut" }}
                  className="absolute bottom-8 right-8 bg-bg-dark text-text-primary-inverse p-4 rounded-xl border border-white/10 flex items-center gap-4 shadow-2xl z-20"
                >
                  <div className="w-10 h-10 bg-accent text-accent-fg rounded-lg flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold uppercase tracking-wider">Model Trained</div>
                    <div className="text-[10px] opacity-60">Success in 42 seconds</div>
                  </div>
                </motion.div>
              </div>
            </div>
            
            {/* Technical Grid Background */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </FadeIn>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 md:py-32 bg-white border-y border-border-subtle">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <FadeIn>
            <h2 className="display-section mb-4">Engineered for quality.</h2>
            <p className="body-md text-text-muted max-w-[60ch] mx-auto mb-16 md:mb-24">
              Toddler isn't just a wrapper. We've built a full-stack engine designed to make custom machine learning reliable and accessible.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              { title: "Dataset Sanitization", tag: "DATA", desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data so you don't have to.", icon: Database },
              { title: "Real-time Training", tag: "ENGINE", desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours.", icon: Cpu },
              { title: "Full Ownership", tag: "LEGAL", desc: "Every model you train is yours. Access the underlying logic and keep your proprietary edge.", icon: Shield },
              { title: "Standard Architecture", tag: "ML", desc: "Uses reliable TF-IDF + Logistic Regression optimized for smaller datasets.", icon: Layers },
              { title: "Interactive Playground", tag: "TEST", desc: "Test your models immediately in a human-friendly interface before using the results.", icon: Play },
              { title: "Clean Validation", tag: "QA", desc: "Automatic 80/20 train-test splits with confusion matrices you can actually read.", icon: Check }
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 50}>
                <Card className="h-full flex flex-col text-left group hover:border-text-primary transition-colors">
                  <div className="flex justify-between items-start mb-12">
                    <div className="w-12 h-12 bg-bg-base rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <f.icon className="text-text-primary" size={24} />
                    </div>
                    <span className="caption text-text-muted border border-border-subtle px-2 py-1 rounded">{f.tag}</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-4">{f.title}</h3>
                  <p className="body-md text-text-muted">{f.desc}</p>
                </Card>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 md:py-48 bg-bg-base">
        <div className="max-w-[1400px] mx-auto px-6">
          <FadeIn className="mb-24">
            <h2 className="display-section max-w-[20ch]">
              Train your model <br />
              <span className="text-text-muted">in three simple steps.</span>
            </h2>
          </FadeIn>

          <div className="grid lg:grid-cols-3 gap-12 md:gap-24">
            {[
              { step: "01", title: "Upload & Map", desc: "Drop your CSV and select which columns contain your text and labels. We handle the rest." },
              { step: "02", title: "Automated Training", desc: "Toddler optimizes the model architecture specifically for your data size and labels." },
              { step: "03", title: "Validate & Test", desc: "Check accuracy on held-out data and test with new input in the live playground." }
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100} className="space-y-8">
                <div className="font-display text-4xl font-bold text-text-primary/10">{s.step}</div>
                <div className="aspect-[4/3] bg-white border border-border-subtle rounded-2xl flex items-center justify-center text-text-muted caption">
                  [ Screenshot Placeholder ]
                </div>
                <div className="space-y-4">
                  <h3 className="font-display text-2xl font-bold">{s.title}</h3>
                  <p className="body-md text-text-muted leading-relaxed">{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 md:py-32 bg-white border-y border-border-subtle">
        <div className="max-w-[1400px] mx-auto px-6">
          <FadeIn className="text-center mb-16">
             <span className="caption text-accent font-bold mb-4 block">Use Cases</span>
             <h2 className="display-section">Build specialized tools.</h2>
          </FadeIn>
          
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Classify support tickets", 
              "Sort survey responses by sentiment", 
              "Flag spam reviews", 
              "Bucket product feedback",
              "Intent recognition",
              "Content moderation"
            ].map((useCase, i) => (
              <FadeIn key={i} delay={i * 30}>
                <div className="px-6 py-3 bg-bg-base border border-border-subtle rounded-full text-sm font-semibold flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {useCase}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Limits & Honesty */}
      <section className="py-24 md:py-32 bg-bg-base">
        <div className="max-w-[1400px] mx-auto px-6">
          <FadeIn>
            <Card className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 items-center text-center md:text-left">
              <div className="w-16 h-16 bg-bg-dark text-text-primary-inverse rounded-2xl flex items-center justify-center shrink-0">
                <Info size={32} />
              </div>
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-bold">Stated Honestly</h3>
                <p className="body-md text-text-muted leading-relaxed">
                  Right now Toddler trains text classifiers on spreadsheets up to 2,000 rows. It is optimized for speed and clarity in V1. Image models and larger datasets are coming.
                </p>
              </div>
            </Card>
          </FadeIn>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-48 bg-white overflow-hidden relative">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <FadeIn className="mb-24">
            <h2 className="display-section mb-6">Simple, human pricing.</h2>
            <p className="body-md text-text-muted">No complicated tokens or usage tiers. Just build.</p>
          </FadeIn>

          <div className="grid md:grid-cols-2 max-w-4xl mx-auto gap-6 md:gap-8 items-stretch">
            <FadeIn delay={100} className="h-full">
              <Card className="h-full flex flex-col justify-between text-left">
                <div className="space-y-8">
                  <div>
                    <span className="caption text-text-muted">Free Tier</span>
                    <div className="text-5xl font-display font-bold mt-2">$0<span className="text-sm font-medium text-text-muted ml-2">/ forever</span></div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      { text: "1 Active Project", included: true },
                      { text: "2,000 Rows per Upload", included: true },
                      { text: "Standard Training Speed", included: true },
                      { text: "Basic Playground", included: true }
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium">
                        <Check size={16} className="text-accent" /> {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="outline" onClick={() => navigate('/signup')} className="mt-12 w-full">Get Started</Button>
              </Card>
            </FadeIn>

            <FadeIn delay={200} className="h-full">
              <Card variant="dark" className="h-full flex flex-col justify-between text-left relative">
                <div className="absolute top-8 right-8">
                  <span className="px-3 py-1 bg-accent text-accent-fg text-[10px] font-bold rounded-full uppercase tracking-widest">Coming Soon</span>
                </div>
                <div className="space-y-8">
                  <div>
                    <span className="caption opacity-40">Pro Plan</span>
                    <div className="text-5xl font-display font-bold mt-2">$49<span className="text-sm font-medium opacity-40 ml-2">/ mo</span></div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "Unlimited Projects",
                      "100k Rows per Upload",
                      "Priority Training Speed",
                      "Model Export (.pkl)",
                      "API Deployment"
                    ].map((text, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-text-primary-inverse/40">
                        <span className="text-accent">—</span> {text}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button variant="accent" className="mt-12 w-full">Join Waiting List</Button>
              </Card>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-32 bg-bg-base border-t border-border-subtle">
        <div className="max-w-3xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="display-section">Frequently asked</h2>
          </FadeIn>
          
          <div className="space-y-4">
            {[
              { q: "What file formats are supported?", a: "V1 currently supports standard CSV files. We recommend UTF-8 encoding for best results." },
              { q: "Is my data secure?", a: "Yes. Your datasets are stored in your private Firebase folder and models are trained in temporary synchronous memory. Your data never leaves your control." },
              { q: "What happens after 2,000 rows?", a: "Right now we cap uploads at 2,000 rows to ensure synchronous training is fast (under 60 seconds). Larger datasets will be supported in our upcoming Pro plan." },
              { q: "Can I export my model?", a: "Model export is a Pro feature coming soon. In V1, you can use your model via the Toddler Playground." }
            ].map((faq, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div className="bg-white border border-border-subtle rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full px-8 py-6 flex items-center justify-between text-left"
                  >
                    <span className="font-bold">{faq.q}</span>
                    <ChevronDown className={`transition-transform duration-300 ${activeFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeFaq === i && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-8 pb-6 text-text-muted text-sm leading-relaxed"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-dark text-text-primary-inverse pt-32 pb-12 overflow-hidden relative">
        <div className="hidden md:block absolute bottom-0 left-0 text-[20vw] font-display font-black leading-none tracking-tighter text-white/[0.02] pointer-events-none select-none -mb-12">
          TODDLER
        </div>

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-8 mb-32">
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-text-primary font-display font-bold text-xl">T</div>
                <span className="font-display font-bold text-3xl tracking-tighter">Toddler</span>
              </div>
              <p className="text-white/40 leading-relaxed max-w-xs font-medium">
                The intelligence layer for specific domain problems. Built for experts who build the future.
              </p>
              <div className="flex gap-4">
                {[Globe, Globe, Globe].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 flex items-center justify-center border border-white/10 rounded-full hover:bg-white/5 transition-all">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="caption text-white/30 tracking-[0.2em]">Platform</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-accent transition-colors">Overview</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="caption text-white/30 tracking-[0.2em]">Company</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-accent transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Brand Assets</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-accent transition-colors">Privacy</a></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="caption text-white/30 tracking-[0.2em]">Newsletter</h4>
              <p className="text-sm text-white/40">Technical updates and machine learning insights.</p>
              <form className="flex border-b border-white/10 pb-2">
                <input 
                  type="email" 
                  placeholder="name@domain.com"
                  className="bg-transparent text-sm focus:outline-none grow"
                />
                <button className="font-bold text-xs uppercase tracking-widest hover:text-accent transition-colors">Join</button>
              </form>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
            <span>© 2026 TODDLER AI. DESIGNED BY HAND.</span>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
              <a href="#" className="hover:text-white transition-colors">GDPR</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
