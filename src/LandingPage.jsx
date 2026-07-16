import React from 'react';
import { ArrowRight, Check, Shield, Zap, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
};

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-toddler-off-white text-toddler-black font-sans selection:bg-toddler-green selection:text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-8 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-toddler-green rounded-sm flex items-center justify-center text-white font-display font-bold">T</div>
          <span className="font-display font-bold text-xl tracking-tight">Toddler</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium">
          <a href="#how-it-works" className="hidden md:block hover:text-toddler-green transition-colors">How it works</a>
          <button className="bg-toddler-green text-white px-5 py-2.5 rounded-sm hover:opacity-90 transition-opacity">
            Start training
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-24 md:px-12 max-w-7xl mx-auto md:pt-32">
        <motion.div 
          className="md:w-3/4 lg:w-2/3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
        >
          <h1 className="font-display text-5xl md:text-8xl font-bold leading-[0.95] tracking-tighter mb-8">
            Train an AI model from your own data. No code. A few minutes.
          </h1>
          <p className="text-xl md:text-2xl text-toddler-black/70 max-w-2xl mb-10 leading-relaxed">
            Upload a spreadsheet, select your columns, and get a custom classifier you can use anywhere. Private, fast, and yours to keep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-toddler-green text-white px-8 py-4 rounded-sm font-bold text-lg hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2">
              Try it free <ArrowRight size={20} />
            </button>
            <div className="flex items-center gap-2 px-4 text-sm font-medium text-toddler-black/50">
              <Check size={16} /> No credit card required
            </div>
          </div>
        </motion.div>

        {/* Hero Visual - Real Screenshot Placeholder */}
        <motion.div 
          className="mt-20 border border-toddler-black/10 rounded-lg overflow-hidden shadow-2xl bg-white"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
        >
          <div className="bg-toddler-off-white border-b border-toddler-black/5 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-toddler-black/10"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-toddler-black/10"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-toddler-black/10"></div>
            </div>
            <div className="mx-auto text-[10px] font-mono text-toddler-black/30 uppercase tracking-widest">Training: Customer_Support_Tickets.csv</div>
          </div>
          <div className="aspect-video bg-gray-50 flex items-center justify-center text-toddler-black/20 font-display italic text-2xl">
            [ Screenshot of the Toddler Training Interface ]
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24 md:px-12 bg-white border-y border-toddler-black/5">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-20 text-center md:text-left"
            {...fadeInUp}
          >
            How it works
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-16">
            <motion.div className="space-y-6" {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.1 }}>
              <div className="aspect-[4/3] bg-toddler-off-white rounded border border-toddler-black/5 flex items-center justify-center text-toddler-black/20 text-sm font-mono uppercase tracking-tighter p-8 text-center">
                [ Step 1: Upload CSV & Select Columns ]
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold">1. Upload your data</h3>
                <p className="text-toddler-black/60 leading-relaxed">
                  Drop a CSV with at least 5 examples per category. We handle the cleaning and validation automatically.
                </p>
              </div>
            </motion.div>

            <motion.div className="space-y-6" {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.2 }}>
              <div className="aspect-[4/3] bg-toddler-off-white rounded border border-toddler-black/5 flex items-center justify-center text-toddler-black/20 text-sm font-mono uppercase tracking-tighter p-8 text-center">
                [ Step 2: Training Progress & Metrics ]
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold">2. Train a model</h3>
                <p className="text-toddler-black/60 leading-relaxed">
                  Watch your model learn in real-time. Training usually takes under 60 seconds for most datasets.
                </p>
              </div>
            </motion.div>

            <motion.div className="space-y-6" {...fadeInUp} transition={{ ...fadeInUp.transition, delay: 0.3 }}>
              <div className="aspect-[4/3] bg-toddler-off-white rounded border border-toddler-black/5 flex items-center justify-center text-toddler-black/20 text-sm font-mono uppercase tracking-tighter p-8 text-center">
                [ Step 3: Playground & API Export ]
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold">3. Use or test it</h3>
                <p className="text-toddler-black/60 leading-relaxed">
                  Test your model in the playground immediately, or download the artifact to use in your own code.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Proof / Demo Section */}
      <section className="px-6 py-24 md:px-12 max-w-7xl mx-auto overflow-hidden">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <motion.div {...fadeInUp}>
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-8">
              Real accuracy from real models.
            </h2>
            <p className="text-lg text-toddler-black/60 mb-12 leading-relaxed">
              Toddler isn't a wrapper for a large language model. It builds specific, efficient tools for specific tasks.
            </p>
            
            <div className="space-y-8">
              <div className="flex gap-4 items-start">
                <div className="text-4xl font-display font-bold text-toddler-green">91%</div>
                <div>
                  <div className="font-bold">Support Ticket Classification</div>
                  <div className="text-sm text-toddler-black/50">Trained on 400 product reviews in 42 seconds.</div>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="text-4xl font-display font-bold text-toddler-green">87%</div>
                <div>
                  <div className="font-bold">Spam Detection</div>
                  <div className="text-sm text-toddler-black/50">Trained on 1,200 SMS messages in 58 seconds.</div>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-toddler-black p-8 rounded-lg text-white font-mono text-sm leading-relaxed"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-white/40 mb-4 border-b border-white/10 pb-2 flex justify-between">
              <span>MODEL_REPORT.txt</span>
              <span>2026-07-16</span>
            </div>
            <div className="text-green-400">Precision: 0.92</div>
            <div className="text-green-400">Recall: 0.89</div>
            <div className="text-green-400">F1-Score: 0.90</div>
            <div className="mt-6 text-white/60 italic">
              "The model successfully distinguished between 'Refund Request' and 'Technical Support' with high confidence."
            </div>
          </motion.div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 py-24 md:px-12 bg-toddler-green text-white">
        <div className="max-w-7xl mx-auto">
          <motion.h2 
            className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-16"
            {...fadeInUp}
          >
            Build specialized tools.
          </motion.h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Classify support tickets", desc: "Route incoming emails to the right department automatically." },
              { title: "Sort survey responses", desc: "Turn thousands of open-ended text answers into actionable data." },
              { title: "Flag spam reviews", desc: "Identify and filter out low-quality or fake product reviews." },
              { title: "Sentiment analysis", desc: "Track how users feel about your new feature in real-time." },
              { title: "Intent recognition", desc: "Predict what a user wants to do from their search query." },
              { title: "Content moderation", desc: "Automatically flag potentially offensive text for human review." }
            ].map((useCase, i) => (
              <motion.div 
                key={i} 
                className="p-8 border border-white/10 rounded-sm hover:border-white/30 transition-colors"
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: i * 0.05 }}
              >
                <h3 className="font-display text-xl font-bold mb-4">{useCase.title}</h3>
                <p className="text-white/60 leading-relaxed">{useCase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ownership Section */}
      <section className="px-6 py-24 md:px-12 max-w-7xl mx-auto text-center md:text-left">
        <motion.div className="max-w-3xl" {...fadeInUp}>
          <div className="inline-flex items-center gap-2 text-toddler-terracotta font-bold text-sm uppercase tracking-widest mb-6">
            <Shield size={16} /> True Ownership
          </div>
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-8 leading-tight">
            You own the model. Not us.
          </h2>
          <p className="text-xl text-toddler-black/60 leading-relaxed mb-8">
            Unlike other AI services, you don't just "rent" an API. When you train a model on Toddler, we give you the artifact. You can host it on your own servers, run it offline, and keep it forever. Your data never leaves your control once training is complete.
          </p>
        </motion.div>
      </section>

      {/* Limits */}
      <section className="px-6 py-24 md:px-12 max-w-7xl mx-auto border-t border-toddler-black/5">
        <motion.div 
          className="bg-toddler-off-white p-8 md:p-12 rounded border border-toddler-black/5 flex flex-col md:flex-row gap-12 items-start"
          {...fadeInUp}
        >
          <div className="w-12 h-12 bg-toddler-black/5 rounded flex items-center justify-center shrink-0">
            <Info className="text-toddler-black/30" />
          </div>
          <div className="space-y-4">
            <h3 className="font-display text-xl font-bold">What Toddler can (and can't) do right now</h3>
            <p className="text-toddler-black/60 max-w-2xl leading-relaxed">
              We are currently in V1. Right now, Toddler trains text classifiers on spreadsheets up to 2,000 rows. It is optimized for speed and clarity. Image models, larger datasets, and generative models are not yet supported.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-32 md:px-12 max-w-7xl mx-auto text-center">
        <motion.h2 
          className="font-display text-4xl md:text-6xl font-bold tracking-tighter mb-12"
          {...fadeInUp}
        >
          Start training in seconds.
        </motion.h2>
        <motion.button 
          className="bg-toddler-green text-white px-12 py-5 rounded-sm font-bold text-xl hover:opacity-90 transition-opacity"
          {...fadeInUp}
          transition={{ ...fadeInUp.transition, delay: 0.1 }}
        >
          Create my first model
        </motion.button>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 md:px-12 border-t border-toddler-black/5 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-toddler-black rounded-sm flex items-center justify-center text-white font-display font-bold text-xs">T</div>
            <span className="font-display font-bold tracking-tight">Toddler</span>
          </div>
          <p className="text-sm text-toddler-black/40">
            A tool for specific people building specific things. © 2026
          </p>
          <div className="flex gap-8 text-sm font-medium text-toddler-black/60">
            <a href="#" className="hover:text-toddler-black transition-colors">Contact</a>
            <a href="#" className="hover:text-toddler-black transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
