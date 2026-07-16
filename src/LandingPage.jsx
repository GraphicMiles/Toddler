import React, { useState } from 'react';
import { ArrowRight, Check, Shield, Zap, Info, Play, Plus, Menu, X, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  };

  return (
    <div className="min-h-screen bg-toddler-off-white text-toddler-black font-sans selection:bg-toddler-black selection:text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-toddler-off-white/80 backdrop-blur-md border-b border-toddler-black/5">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 bg-toddler-black rounded-sm flex items-center justify-center text-white font-display font-bold">T</div>
              <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm font-medium hover:text-toddler-green transition-colors">How it works</a>
              <a href="#use-cases" className="text-sm font-medium hover:text-toddler-green transition-colors">Use cases</a>
              <a href="#pricing" className="text-sm font-medium hover:text-toddler-green transition-colors">Pricing</a>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="hidden sm:block text-sm font-bold uppercase tracking-widest hover:opacity-70 transition-opacity px-4"
            >
              Sign in
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-toddler-black text-white px-6 py-2.5 rounded-sm font-bold text-sm hover:bg-toddler-black/90 transition-colors"
            >
              Get started
            </button>
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-toddler-black/5 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              <a href="#how-it-works" className="text-lg font-display font-bold" onClick={() => setMobileMenuOpen(false)}>How it works</a>
              <a href="#use-cases" className="text-lg font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Use cases</a>
              <a href="#pricing" className="text-lg font-display font-bold" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <hr className="border-toddler-black/5" />
              <button onClick={() => navigate('/login')} className="text-left font-bold uppercase tracking-widest text-sm">Sign in</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <header className="relative pt-20 pb-32 overflow-hidden border-b border-toddler-black/5">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-6 px-4 py-1.5 border border-toddler-black/10 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-toddler-green animate-pulse" />
              Build custom AI in minutes
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-6xl md:text-9xl font-bold leading-[0.9] tracking-tighter mb-8"
            >
              Train your data. <br />
              <span className="text-toddler-black/30">Own the model.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-toddler-black/60 max-w-2xl mb-12 leading-relaxed"
            >
              The first AI training platform built for non-technical teams. No code, no complex math, just clean results you can host anywhere.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={() => navigate('/signup')}
                className="bg-toddler-black text-white px-10 py-5 rounded-sm font-bold text-lg hover:bg-toddler-black/90 transition-all flex items-center justify-center gap-2 group"
              >
                Start Training <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white border border-toddler-black/10 px-10 py-5 rounded-sm font-bold text-lg hover:bg-toddler-off-white transition-all flex items-center justify-center gap-2">
                <Play size={18} fill="currentColor" /> Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Featured UI Element - Inspired by Ref 11/14 */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-24 relative max-w-5xl mx-auto"
          >
            <div className="bg-white border border-toddler-black/10 rounded-xl overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
              <div className="bg-toddler-off-white/50 border-b border-toddler-black/5 px-6 py-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="text-[11px] font-mono font-bold text-toddler-black/20 uppercase tracking-widest">toddler_workspace_v1.0</div>
                <div className="w-12" />
              </div>
              
              <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12">
                <div className="flex-grow space-y-8">
                  <div className="space-y-4">
                    <div className="h-4 w-32 bg-toddler-black/5 rounded" />
                    <div className="h-12 w-full bg-toddler-black/[0.02] border border-toddler-black/5 rounded-sm flex items-center px-4 justify-between">
                      <span className="text-sm font-medium">Customer_Reviews_2026.csv</span>
                      <span className="text-[10px] font-bold text-toddler-green uppercase">Uploaded</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-toddler-black/5 rounded" />
                      <div className="h-10 w-full border border-toddler-black/10 rounded-sm" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 w-20 bg-toddler-black/5 rounded" />
                      <div className="h-10 w-full border border-toddler-black/10 rounded-sm" />
                    </div>
                  </div>
                  
                  <div className="h-40 w-full bg-toddler-black/[0.01] border border-dashed border-toddler-black/10 rounded flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-toddler-black/20">
                      <Plus size={32} />
                      <span className="text-xs font-bold uppercase tracking-widest">Training Queue</span>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-64 shrink-0 space-y-6">
                  <div className="p-6 bg-toddler-green text-white rounded-sm space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">Status</div>
                    <div className="text-2xl font-display font-bold tracking-tight">94.2% Accuracy</div>
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '94.2%' }}
                        transition={{ duration: 2, delay: 1 }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>
                  
                  <div className="p-6 border border-toddler-black/5 rounded-sm space-y-4">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-toddler-black/30">Predictions</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Sentiment</span>
                        <span className="font-bold">Positive</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Confidence</span>
                        <span className="font-bold">0.98</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Grid Pattern */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          </motion.div>
        </div>
      </header>

      {/* Social Proof / Logo Cloud */}
      <section className="py-20 border-b border-toddler-black/5 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.3em] text-toddler-black/30 mb-12">Building the future of specific intelligence</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale">
            <span className="font-display font-bold text-2xl tracking-tighter">TRANSFORM</span>
            <span className="font-display font-bold text-2xl tracking-tighter">QUARK.AI</span>
            <span className="font-display font-bold text-2xl tracking-tighter">LINEAR</span>
            <span className="font-display font-bold text-2xl tracking-tighter">PROTOCOL</span>
            <span className="font-display font-bold text-2xl tracking-tighter">VERCEL</span>
          </div>
        </div>
      </section>

      {/* Core Features / Grid Layout - Inspired by Ref 15 */}
      <section id="how-it-works" className="py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-32 items-end mb-32">
            <motion.h2 
              {...fadeInUp}
              className="font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tighter"
            >
              Everything you need to <br />
              <span className="text-toddler-black/30">automate the expert.</span>
            </motion.h2>
            <motion.p 
              {...fadeInUp}
              className="text-lg md:text-xl text-toddler-black/60 max-w-md leading-relaxed"
            >
              Toddler handles the complex ML infrastructure so you can focus on labeling and refining your specific use cases.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-toddler-black/5 border border-toddler-black/5">
            {[
              {
                title: "CSV Native",
                desc: "Upload standard spreadsheets. No data engineering or complex formatting required.",
                icon: <Globe className="text-toddler-green" size={24} />
              },
              {
                title: "Instant Feedback",
                desc: "Watch accuracy metrics and confusion matrices update in real-time as you train.",
                icon: <Zap className="text-toddler-green" size={24} />
              },
              {
                title: "Export Anywhere",
                desc: "Download standard model artifacts. Host them on your infrastructure or use our API.",
                icon: <ArrowRight className="text-toddler-green" size={24} />
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: i * 0.1 }}
                className="bg-white p-12 space-y-6 group cursor-default"
              >
                <div className="w-12 h-12 flex items-center justify-center border border-toddler-black/5 group-hover:bg-toddler-off-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight">{feature.title}</h3>
                <p className="text-toddler-black/60 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-32 bg-toddler-off-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-20">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-toddler-green mb-4">Industries & Apps</div>
              <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tighter">Specialize by default.</h2>
            </div>
            <button className="text-sm font-bold uppercase tracking-widest border-b-2 border-toddler-black py-1">View all examples</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { tag: "Legal", title: "Contract Analysis", body: "Categorize clauses and flag risks automatically." },
              { tag: "Fintech", title: "Transaction Sorting", body: "Identify merchant types and spending patterns." },
              { tag: "SaaS", title: "Support Routing", body: "Direct tickets based on sentiment and intent." },
              { tag: "E-commerce", title: "Review Filtering", body: "Flag low-quality reviews and group feedback." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: i * 0.1 }}
                className="bg-white p-8 border border-toddler-black/5 space-y-12 flex flex-col justify-between aspect-square"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-toddler-black/30">{item.tag}</span>
                <div className="space-y-4">
                  <h3 className="font-display text-2xl font-bold tracking-tight leading-none">{item.title}</h3>
                  <p className="text-sm text-toddler-black/50 leading-relaxed">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / CTA section - Inspired by Ref 3/6 */}
      <section id="pricing" className="py-32 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <motion.div {...fadeInUp} className="max-w-2xl mx-auto space-y-6 mb-20">
            <h2 className="font-display text-5xl md:text-7xl font-bold tracking-tighter">Simple, human pricing.</h2>
            <p className="text-lg text-toddler-black/60">No complicated tokens or usage tiers. Just build.</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 max-w-4xl mx-auto gap-8 text-left">
            <motion.div {...fadeInUp} className="p-12 border border-toddler-black/10 rounded-sm space-y-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-toddler-black/30">Free Tier</div>
                <div className="text-5xl font-display font-bold tracking-tight">$0<span className="text-sm font-medium text-toddler-black/40">/ forever</span></div>
                <p className="text-sm text-toddler-black/60">Perfect for testing your first dataset and learning the ropes.</p>
                <hr className="border-toddler-black/5" />
                <ul className="space-y-3">
                  {["1 Active Project", "2,000 Rows per Upload", "Standard Scikit-learn Training", "Basic Playground"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check size={14} className="text-toddler-green" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={() => navigate('/signup')}
                className="w-full py-4 border border-toddler-black font-bold uppercase tracking-widest text-xs hover:bg-toddler-off-white transition-colors"
              >
                Get Started
              </button>
            </motion.div>

            <motion.div {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }} className="p-12 bg-toddler-black text-white rounded-sm space-y-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-40">Professional</div>
                  <span className="px-2 py-0.5 bg-toddler-green text-[9px] font-bold uppercase tracking-widest rounded-full">Coming Soon</span>
                </div>
                <div className="text-5xl font-display font-bold tracking-tight">$49<span className="text-sm font-medium opacity-40">/ mo</span></div>
                <p className="text-sm opacity-60">For production models and larger datasets.</p>
                <hr className="border-white/10" />
                <ul className="space-y-3">
                  {["Unlimited Projects", "100k Rows per Upload", "Hyperparameter Tuning", "API Deployment", "Model Export"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <Check size={14} className="text-toddler-green" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
              <button className="w-full py-4 bg-white text-toddler-black font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-colors">
                Join Waiting List
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer - Inspired by Ref 4/9/10 */}
      <footer className="bg-toddler-black text-white py-24 md:py-32 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 relative">
          {/* Large Background Logo - Ref 4 */}
          <div className="absolute bottom-0 left-0 text-[20vw] font-display font-bold leading-none tracking-tighter text-white/[0.02] pointer-events-none select-none -mb-[5vw]">
            TODDLER
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-16 md:gap-8 mb-24 relative z-10">
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center text-toddler-black font-display font-bold">T</div>
                <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
              </div>
              <p className="text-white/40 max-w-xs leading-relaxed">
                Empowering domain experts to build specialized AI without the engineering overhead.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-full hover:bg-white/5 transition-colors"><Globe size={14} /></a>
                <a href="#" className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-full hover:bg-white/5 transition-colors"><Globe size={14} /></a>
                <a href="#" className="w-8 h-8 flex items-center justify-center border border-white/10 rounded-full hover:bg-white/5 transition-colors"><Globe size={14} /></a>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white/60 transition-colors">Overview</a></li>
                <li><a href="#" className="hover:text-white/60 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white/60 transition-colors">Roadmap</a></li>
                <li><a href="#" className="hover:text-white/60 transition-colors">API Docs</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white/60 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white/60 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white/60 transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Newsletter</h4>
              <p className="text-sm text-white/40 leading-relaxed">Stay updated with our latest releases and ML tips.</p>
              <div className="flex">
                <input 
                  type="email" 
                  placeholder="Email address"
                  className="bg-white/5 border border-white/10 px-4 py-2.5 text-sm focus:outline-none focus:border-white/20 grow"
                />
                <button className="bg-white text-toddler-black px-4 font-bold text-xs uppercase tracking-widest">Join</button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 relative z-10">
            <span>© 2026 TODDLER AI. All rights reserved.</span>
            <div className="flex gap-6">
              <span>GDPR Compliant</span>
              <span>ISO 27001 Certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
