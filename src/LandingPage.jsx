import React, { useState } from 'react';
import { ArrowRight, Check, Shield, Zap, Info, Play, Plus, Menu, X, Globe, Layers, Cpu, Database, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  };

  return (
    <div className="min-h-screen bg-white text-toddler-black font-sans selection:bg-toddler-black selection:text-white overflow-x-hidden">
      {/* Background Grid - Ref a281 */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-toddler-black/5">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
              <div className="w-9 h-9 bg-toddler-black rounded-lg flex items-center justify-center text-white font-display font-bold transition-transform group-hover:scale-110">T</div>
              <span className="font-display font-bold text-2xl tracking-tighter">Toddler</span>
            </div>
            <div className="hidden lg:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-toddler-black/60 hover:text-toddler-black transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-semibold text-toddler-black/60 hover:text-toddler-black transition-colors">How it works</a>
              <a href="#use-cases" className="text-sm font-semibold text-toddler-black/60 hover:text-toddler-black transition-colors">Use Cases</a>
              <a href="#pricing" className="text-sm font-semibold text-toddler-black/60 hover:text-toddler-black transition-colors">Pricing</a>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/login')}
              className="hidden sm:block text-sm font-bold uppercase tracking-widest hover:opacity-60 transition-opacity"
            >
              Log in
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-toddler-black text-white px-7 py-3 rounded-full font-bold text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Get started free
            </button>
            <button 
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Inspired by Ref 5270 & fa07 */}
      <header className="relative pt-24 pb-32">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <div className="mb-8 px-4 py-1.5 bg-toddler-off-white border border-toddler-black/5 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] text-toddler-black/40 inline-flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-toddler-green animate-pulse" />
              v1.0 Now in Public Beta
            </div>
            
            <h1 className="font-display text-7xl md:text-[120px] font-bold leading-[0.85] tracking-tighter mb-10 max-w-5xl">
              Turn your data into <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-toddler-black via-toddler-black/40 to-toddler-black">pure intelligence.</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-toddler-black/50 max-w-2xl mb-12 leading-relaxed font-medium">
              Train, own, and deploy custom AI models without writing code. The sophisticated toolkit for modern domain experts.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5">
              <button 
                onClick={() => navigate('/signup')}
                className="bg-toddler-black text-white px-10 py-5 rounded-full font-bold text-lg hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group"
              >
                Start Training Free <ArrowRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="bg-white border border-toddler-black/10 px-10 py-5 rounded-full font-bold text-lg hover:bg-toddler-off-white transition-all flex items-center justify-center gap-3">
                <Play size={20} fill="currentColor" /> Watch 2min Demo
              </button>
            </div>
          </motion.div>

          {/* Floating UI Elements - Ref fa07 & a281 */}
          <div className="mt-32 relative max-w-6xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="bg-white border-2 border-toddler-black rounded-2xl overflow-hidden p-4"
            >
              <div className="bg-toddler-off-white rounded-xl border border-toddler-black/10 aspect-[16/9] flex items-center justify-center relative overflow-hidden">
                {/* Simulated UI Mockup - Ref 086a */}
                <div className="absolute inset-0 p-12 flex flex-col gap-10">
                   <div className="flex justify-between items-center">
                      <div className="h-6 w-48 bg-toddler-black/5 rounded-full" />
                      <div className="flex gap-4">
                        <div className="h-10 w-32 bg-toddler-green/10 border border-toddler-green/20 rounded-full" />
                        <div className="h-10 w-10 bg-toddler-black/5 rounded-full" />
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-12 gap-8 flex-grow">
                      <div className="col-span-8 bg-white border border-toddler-black/5 rounded-xl p-8 space-y-6">
                        <div className="h-4 w-1/3 bg-toddler-black/5 rounded" />
                        <div className="space-y-4">
                          {[1,2,3,4].map(i => (
                            <div key={i} className="flex gap-4 items-center">
                              <div className="h-10 w-full bg-toddler-off-white rounded-lg" />
                              <div className="h-10 w-24 bg-toddler-off-white rounded-lg" />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="col-span-4 flex flex-col gap-6">
                         <div className="h-1/2 bg-toddler-black rounded-xl p-8 text-white flex flex-col justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Accuracy</span>
                            <span className="text-4xl font-display font-bold">98.4%</span>
                         </div>
                         <div className="h-1/2 bg-white border border-toddler-black/5 rounded-xl p-8">
                            <div className="h-4 w-20 bg-toddler-black/5 rounded mb-4" />
                            <div className="space-y-2">
                              <div className="h-2 w-full bg-toddler-black/5 rounded" />
                              <div className="h-2 w-2/3 bg-toddler-black/5 rounded" />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
                
                {/* Floating Labels - Ref fa07 */}
                <motion.div 
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute top-20 -left-10 bg-white p-4 rounded-xl border-2 border-toddler-black flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 font-bold">CSV</div>
                  <div className="text-left">
                    <div className="text-xs font-bold">Dataset_final.csv</div>
                    <div className="text-[10px] text-toddler-black/40">2,400 rows processed</div>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute bottom-40 -right-10 bg-toddler-green text-white p-4 rounded-xl border-2 border-toddler-black flex items-center gap-4"
                >
                  <Zap size={20} />
                  <div className="text-left">
                    <div className="text-xs font-bold">Model Trained</div>
                    <div className="text-[10px] opacity-60">Success in 42 seconds</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Feature Grid - Inspired by Ref 6667 & fa07 */}
      <section id="features" className="py-40 bg-toddler-off-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-24 max-w-3xl mx-auto space-y-6">
            <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tighter">Engineered for quality.</h2>
            <p className="text-lg text-toddler-black/50 leading-relaxed font-medium">Toddler isn't just a wrapper. We've built a full-stack engine designed to make custom machine learning reliable and accessible.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Dataset Sanitization",
                desc: "Automatic handling of missing values, outliers, and encoding. We prepare your data so you don't have to.",
                icon: <Database className="text-toddler-green" />,
                tag: "DATA"
              },
              {
                title: "Real-time Training",
                desc: "Synchronous training cycles with live metric updates. No hidden queues or waiting for hours.",
                icon: <Cpu className="text-toddler-green" />,
                tag: "ENGINE"
              },
              {
                title: "Full Ownership",
                desc: "Every model you train is yours. Download the standard artifacts and host them anywhere.",
                icon: <Shield className="text-toddler-green" />,
                tag: "LEGAL"
              },
              {
                title: "Cross-platform API",
                desc: "Deploy models with a single click. Access them via a simple REST API or native SDKs.",
                icon: <Globe className="text-toddler-green" />,
                tag: "API"
              },
              {
                title: "Interactive Playground",
                desc: "Test your models immediately in a human-friendly interface before deploying to production.",
                icon: <Play className="text-toddler-green" />,
                tag: "TEST"
              },
              {
                title: "Mobile Optimization",
                desc: "Monitor training and test predictions from any device with our optimized mobile dashboard.",
                icon: <Smartphone className="text-toddler-green" />,
                tag: "UX"
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: i * 0.1 }}
                className="bg-white p-10 rounded-2xl border border-toddler-black/5 hover:border-toddler-black/10 transition-all hover:shadow-lg group"
              >
                <div className="flex justify-between items-start mb-12">
                   <div className="w-14 h-14 bg-toddler-off-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      {f.icon}
                   </div>
                   <span className="text-[9px] font-bold tracking-[0.2em] text-toddler-black/20 uppercase border border-toddler-black/5 px-2 py-1 rounded">{f.tag}</span>
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight mb-4">{f.title}</h3>
                <p className="text-toddler-black/50 leading-relaxed text-sm font-medium">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof / Detailed Section - Inspired by Ref 15 */}
      <section id="how-it-works" className="py-40 bg-white overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-24">
            <div className="lg:w-1/2 space-y-12">
              <h2 className="font-display text-6xl md:text-8xl font-bold leading-[0.9] tracking-tighter">
                Train your model <br />
                <span className="text-toddler-black/20">in three simple steps.</span>
              </h2>
              
              <div className="space-y-10">
                {[
                  { step: "01", title: "Upload & Map", desc: "Drop your CSV and select which columns contain your text and labels." },
                  { step: "02", title: "Automated Training", desc: "Toddler optimizes the model architecture specifically for your data size." },
                  { step: "03", title: "Validate & Ship", desc: "Check accuracy on held-out data and export your model to the world." }
                ].map((s, i) => (
                  <div key={i} className="flex gap-8 group">
                    <span className="font-display text-3xl font-bold text-toddler-black/10 group-hover:text-toddler-green transition-colors">{s.step}</span>
                    <div className="space-y-2">
                      <h4 className="text-xl font-bold tracking-tight">{s.title}</h4>
                      <p className="text-toddler-black/50 leading-relaxed text-sm max-w-md">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-1/2 relative">
               {/* Visual Illustration of "Mapping" - Ref fa07 */}
               <div className="bg-toddler-black rounded-3xl p-12 aspect-square flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-80 h-80 border border-white/10 rounded-full flex items-center justify-center"
                  >
                    <div className="w-60 h-60 border border-white/20 rounded-full flex items-center justify-center">
                      <div className="w-40 h-40 border border-white/30 rounded-full" />
                    </div>
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-6 text-white text-center">
                    <div className="w-20 h-20 bg-toddler-green rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(26,60,52,0.5)]">
                      <Database size={40} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-display font-bold">100% Secure</div>
                      <div className="text-xs opacity-40 uppercase tracking-widest font-bold">Encrypted End-to-End</div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Inspired by Ref 3b7e & f1e9 */}
      <section id="pricing" className="py-40 bg-toddler-off-white">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center mb-24 max-w-2xl mx-auto space-y-6">
            <h2 className="font-display text-5xl md:text-6xl font-bold tracking-tighter">Simple, honest pricing.</h2>
            <p className="text-lg text-toddler-black/50 leading-relaxed font-medium">Build your first model for free. Upgrade as you scale.</p>
          </div>

          <div className="grid md:grid-cols-2 max-w-5xl mx-auto gap-8">
            {/* Free Plan */}
            <motion.div 
              {...fadeInUp}
              className="bg-white p-12 rounded-3xl border border-toddler-black/5 flex flex-col justify-between"
            >
              <div className="space-y-10">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-toddler-black/30">Free Tier</span>
                  <div className="text-6xl font-display font-bold">$0<span className="text-lg text-toddler-black/20 ml-2">/ month</span></div>
                </div>
                <p className="text-toddler-black/50 text-sm font-medium">Perfect for individuals and small tests. No credit card required.</p>
                <div className="space-y-4">
                  {["1 Active Project", "Up to 2,000 Rows", "Community Support", "Standard Training Speed"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-5 h-5 bg-toddler-green/10 text-toddler-green rounded-full flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => navigate('/signup')}
                className="mt-16 w-full py-5 border-2 border-toddler-black rounded-full font-bold uppercase tracking-widest text-xs hover:bg-toddler-off-white transition-all"
              >
                Get Started
              </button>
            </motion.div>

            {/* Pro Plan */}
            <motion.div 
              {...fadeInUp}
              transition={{ delay: 0.1 }}
              className="bg-toddler-black p-12 rounded-3xl text-white relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-8">
                <span className="px-3 py-1 bg-toddler-green text-[10px] font-bold uppercase tracking-widest rounded-full">Coming Soon</span>
              </div>
              
              <div className="space-y-10">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">Pro Plan</span>
                  <div className="text-6xl font-display font-bold">$49<span className="text-lg opacity-20 ml-2">/ month</span></div>
                </div>
                <p className="opacity-50 text-sm font-medium">For production-scale models and advanced engineering teams.</p>
                <div className="space-y-4">
                  {["Unlimited Projects", "Up to 100k Rows", "API Deployment", "Model Export (.pkl)", "Priority Support", "Advanced Metrics"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="w-5 h-5 bg-white/10 text-toddler-green rounded-full flex items-center justify-center shrink-0">
                        <Check size={12} />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <button className="mt-16 w-full py-5 bg-toddler-green text-white rounded-full font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all">
                Join Waiting List
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer - Inspired by Ref 83a9 & e5b5 */}
      <footer className="bg-toddler-black text-white pt-32 pb-12 overflow-hidden relative">
        {/* Large Watermark - Ref 83a9 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30vw] font-display font-black leading-none tracking-tighter text-white/[0.02] pointer-events-none select-none">
          TODDLER
        </div>

        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-20 mb-32">
            <div className="space-y-8">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-toddler-black font-display font-bold text-xl">T</div>
                <span className="font-display font-bold text-3xl tracking-tighter">Toddler</span>
              </div>
              <p className="text-white/40 leading-relaxed max-w-xs font-medium">
                The intelligence layer for specific domain problems. Built for experts who build the future.
              </p>
              <div className="flex gap-4">
                {[Globe, Globe, Globe].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 flex items-center justify-center border border-white/10 rounded-full hover:bg-white/5 hover:border-white/20 transition-all">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-white/30">Platform</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-toddler-green transition-colors">Overview</a></li>
                <li><a href="#" className="hover:text-toddler-green transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-toddler-green transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-toddler-green transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-white/30">Company</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-toddler-green transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-toddler-green transition-colors">Brand Assets</a></li>
                <li><a href="#" className="hover:text-toddler-green transition-colors">Changelog</a></li>
                <li><a href="#" className="hover:text-toddler-green transition-colors">Privacy</a></li>
              </ul>
            </div>

            <div className="space-y-8">
              <h4 className="text-xs font-bold uppercase tracking-[0.25em] text-white/30">Subscribe</h4>
              <p className="text-sm text-white/40 font-medium">Get technical updates and machine learning insights.</p>
              <form className="flex">
                <input 
                  type="email" 
                  placeholder="name@email.com"
                  className="bg-white/5 border border-white/10 px-5 py-3 text-sm focus:outline-none focus:border-white/30 grow rounded-l-lg"
                />
                <button className="bg-white text-toddler-black px-6 font-bold text-xs uppercase tracking-widest rounded-r-lg hover:bg-white/90 transition-colors">Join</button>
              </form>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
            <span>© 2026 TODDLER AI. DESIGNED BY HAND.</span>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
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
