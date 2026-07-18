import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav>
        <div className="nav-inner">
          <div className="logo cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <span className="logo-mark"></span>TODDLER
          </div>
          <div className={`nav-links ${mobileMenuOpen ? '!flex flex-col absolute top-full left-0 w-full bg-[#14130F] p-6 border-b border-[var(--line)] gap-6' : ''}`}>
            <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            {mobileMenuOpen && (
              <>
                <Link to="/login" className="text-[var(--text-dim)]">Log in</Link>
                <Link to="/signup" className="text-[var(--accent-lime)]">Get started</Link>
              </>
            )}
          </div>
          <div className="nav-cta hidden md:flex">
            <Link className="btn-ghost" to="/login">Log in</Link>
            <Link className="btn btn-solid" to="/signup">Get started</Link>
          </div>
          <button className="md:hidden text-white ml-auto border-none bg-transparent" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? 'CLOSE' : 'MENU'}
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap">
          <div className="eyebrow"><span className="dot"></span>v1.0 · public beta</div>
          <h1>Upload a spreadsheet.<br/>Walk away with a <em>classifier</em>.</h1>
          <p>Toddler trains models on the data you already have — no ML background, no vendor lock-in. Every model you train is yours to export, forever.</p>
          <div className="hero-actions">
            <Link className="btn btn-solid" to="/signup">Train your first model →</Link>
            <a className="btn" href="#how">See how it works</a>
          </div>

          <div className="reticle-demo">
            <div className="reticle-bar">
              <span className="chip"></span>
              <span>support_tickets_final.csv</span>
              <span style={{ marginLeft: 'auto' }}>row 1,842 / 3,001</span>
            </div>
            <div className="reticle-body">
              <div className="sample-row">
                "hey — never got my refund from last week, this is the third time i'm asking,{' '}
                <span className="tag spam">
                  <span className="tag-label">predicted: urgent</span>
                  seriously considering a chargeback
                </span>{' '}
                if this isn't fixed today."
              </div>
              <div className="readout">
                <span>model: <b>support-triage-v3</b></span>
                <span>accuracy: <b>96.2%</b></span>
                <span>inference: <b>4ms</b></span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section" id="how">
        <div className="wrap">
          <div className="section-head">
            <div className="section-label">01 — How it works</div>
            <h2>Three steps, no notebook required.</h2>
            <p className="section-sub">Toddler handles the parts that usually require a data science team — cleaning, encoding, validation — so you can stay focused on the labels that matter to your domain.</p>
          </div>
          <div className="grid-blocks">
            <div className="card">
              <div className="card-id mono">STEP · A</div>
              <h3>Drop in your CSV</h3>
              <p>Missing values, outliers and inconsistent encoding are handled automatically before training starts.</p>
            </div>
            <div className="card">
              <div className="card-id mono">STEP · B</div>
              <h3>Map your columns</h3>
              <p>Tell Toddler which column is the text and which is the label. That's the entire configuration step.</p>
            </div>
            <div className="card">
              <div className="card-id mono">STEP · C</div>
              <h3>Train in the cloud</h3>
              <p>Watch accuracy update live as the Toddler engine picks the best model for your data — no notebook wrangling required.</p>
            </div>
            <div className="card">
              <div className="card-id mono">STEP · D</div>
              <h3>Own the artifact</h3>
              <p>Export a portable <span className="mono">.pkl</span> file or call your model through a REST API. It's yours either way.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="wrap">
          <div className="section-head">
            <div className="section-label">02 — Under the hood</div>
            <h2>Built for people who trust their own judgment more than a black box.</h2>
            <p className="section-sub">Every prediction comes with the evidence behind it — so you can explain a result to a colleague, not just report it.</p>
          </div>
          <div className="grid-blocks">
            <div className="card">
              <div className="card-id mono">FEAT · 01</div>
              <h3>Word-level explainability</h3>
              <p>See exactly which words in a sample pushed the model toward its prediction, weighted and highlighted inline.</p>
            </div>
            <div className="card">
              <div className="card-id mono">FEAT · 02</div>
              <h3>Confusion matrices, live</h3>
              <p>Interactive matrices and feature-importance charts update as you retrain, no separate analytics step.</p>
            </div>
            <div className="card">
              <div className="card-id mono">FEAT · 03</div>
              <h3>Cross-platform API</h3>
              <p>Deploy with one click and call your model from any stack through a REST endpoint or an SDK.</p>
            </div>
            <div className="card">
              <div className="card-id mono">FEAT · 04</div>
              <h3>Full ownership, always</h3>
              <p>Nothing is held hostage behind a subscription. Export your trained model and walk away whenever you want.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div className="section-head">
            <div className="section-label">03 — Pricing</div>
            <h2>Simple, honest pricing.</h2>
            <p className="section-sub">Start free with a real project. Upgrade only once you outgrow the row limit.</p>
          </div>
          <div className="price-grid">
            <div className="price-card">
              <div className="plan-name">Standard</div>
              <div className="price">$0<span>/mo</span></div>
              <ul className="plan-list">
                <li>1 active project</li>
                <li>Up to 2,000 rows</li>
                <li>Playground access</li>
                <li>Community support</li>
              </ul>
              <Link className="btn btn-full" to="/signup">Get started</Link>
            </div>
            <div className="price-card pro">
              <div className="plan-name">Pro</div>
              <div className="price">$49<span>/mo</span></div>
              <ul className="plan-list">
                <li>Unlimited projects</li>
                <li>Up to 100k rows</li>
                <li>API access</li>
                <li>Export .pkl artifacts</li>
              </ul>
              <Link className="btn btn-solid btn-full" to="/signup">Join the list</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="wrap">
          <h2>Your data already knows the answer. Toddler just reads it back to you.</h2>
          <Link className="btn btn-solid" to="/signup">Start training free →</Link>
        </div>
      </section>

      <footer>
        <div className="wrap foot-inner">
          <div>
            <div className="logo" style={{ marginBottom: '6px' }}>TODDLER</div>
            <div className="foot-note">Handcrafted for domain experts. Lagos, NG.</div>
          </div>
          <div className="foot-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
          <div className="foot-note">© 2026 Toddler</div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
