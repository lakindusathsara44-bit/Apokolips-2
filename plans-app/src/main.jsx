import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const plans = [
  { name: 'Apokolips Go', tier: '01 / STARTER', count: 1, standard: 150, description: 'A simple starting point for one website, portfolio, or project.', features: ['1 custom subdomain', 'DNS connection guidance', 'Email application support'] },
  { name: 'Apokolips Plus', tier: '02 / CREATOR', count: 5, standard: 750, description: 'A flexible package for several websites and growing ideas.', features: ['5 custom subdomains', 'Organise multiple projects', 'DNS connection guidance'] },
  { name: 'Apokolips Pro', tier: '03 / PROFESSIONAL', count: 20, standard: 3000, description: 'More room for a collection of services, products, and projects.', features: ['20 custom subdomains', 'For multiple brands or projects', 'DNS connection guidance'], popular: true },
  { name: 'Apokolips Premium', tier: '04 / ADVANCED', count: 40, standard: 6000, description: 'Our largest package for managing a wider digital presence.', features: ['40 custom subdomains', 'For larger project collections', 'DNS connection guidance'] }
];

function App() {
  const [withWww, setWithWww] = useState(false);
  const [selected, setSelected] = useState('');
  const pricing = useMemo(() => plans.map(plan => ({ ...plan, price: plan.standard + (withWww ? plan.count * 50 : 0) })), [withWww]);

  function apply(plan) {
    const option = withWww ? 'with www support' : 'without www support';
    const label = plan.name + ' - ' + plan.count + ' subdomain' + (plan.count > 1 ? 's' : '') + ' (' + option + ', LKR ' + plan.price.toLocaleString('en-LK') + '/month)';
    const subject = 'Plan Request - ' + plan.name;
    const body = 'Dear Apokolips Team,\n\nI would like to request the ' + label + ' plan. Please review my application and let me know the next steps.\n\nUSER DETAILS\nPlan: ' + label + '\nPreferred subdomain name(s): [Enter your preferred names]\nFull name: [Enter your full name]\nPhone / WhatsApp: [Enter your number]\nEmail: [Enter your email]\n\nPROJECT DETAILS\nWebsite or project description: [Tell us what you plan to build]\nHosting provider: [Enter your hosting provider]\n\nThank you.\n[Your name]';
    window.location.href = 'mailto:apokolips.contact@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  return <div className="plans-app">
    <div className="plans-orb plans-orb-one" aria-hidden="true" />
    <div className="plans-orb plans-orb-two" aria-hidden="true" />
    <main className="plans-container">
      <div className="plans-kicker"><span className="live-dot" /> APOKOLIPS / SUBDOMAIN SERVICES</div>
      <section className="plans-hero">
        <div className="hero-copy">
          <p className="overline">YOUR IDEA. YOUR OWN ADDRESS.</p>
          <h1>Give your next idea<br /><span>a place to live.</span></h1>
          <p className="hero-description">A memorable Apokolips.xyz address for your website, business, portfolio, or next big project. Choose a package that fits the way you build.</p>
          <div className="hero-points"><span><i>✦</i> Custom subdomain</span><span><i>✦</i> Monthly packages</span><span><i>✦</i> Apply by email</span></div>
        </div>
        <div className="domain-preview" aria-label="Example subdomain address">
          <div className="preview-top"><span /> <span /> <span /><small>YOUR DIGITAL SPACE</small></div>
          <div className="preview-address"><b>yourname</b><span>.apokolips.xyz</span></div>
          <div className="preview-line" />
          <div className="preview-caption">A simple address. A world of possibilities.</div>
          <div className="preview-glow" />
        </div>
      </section>

      <section className="audience-section">
        <div><p className="section-label">BUILT FOR DIFFERENT IDEAS</p><h2>What will you create?</h2></div>
        <p className="audience-intro">From a first student project to a growing online business, bring your own hosting and give it a clear web address.</p>
        <div className="audience-grid">
          {['University projects','Small shops & businesses','Personal portfolios','Education websites','Class & course sites','Community projects','Blogs & information sites','Something new'].map((item, i) => <div className="audience-item" key={item}><span>{String(i + 1).padStart(2, '0')}</span>{item}</div>)}
        </div>
      </section>

      <section className="pricing-section" id="packages">
        <div className="pricing-heading">
          <div><p className="section-label">SIMPLE MONTHLY PACKAGES</p><h2>Choose your plan<span>.</span></h2><p className="pricing-subtitle">Every package gives you a set number of subdomains under apokolips.xyz.</p></div>
          <div className="www-control">
            <div className="www-copy"><b>Include www support</b><small>Also configure www.yourname.apokolips.xyz</small></div>
            <button type="button" className={'switch ' + (withWww ? 'switch-on' : '')} role="switch" aria-checked={withWww} aria-label="Include www support" onClick={() => setWithWww(!withWww)}><span /></button>
          </div>
        </div>
        <div className="price-note">Showing {withWww ? 'packages with www support' : 'standard packages without www'} <span>·</span> www adds LKR 50 per subdomain / month</div>
        <div className="plan-cards">
          {pricing.map(plan => <article key={plan.name} className={'plan-card ' + (plan.popular ? 'plan-popular' : '')}>
            {plan.popular && <div className="popular-label">POPULAR CHOICE</div>}
            <div className="plan-tier">{plan.tier}</div>
            <h3>{plan.name}</h3>
            <p className="plan-description">{plan.description}</p>
            <div className="plan-price"><span className="currency">LKR</span> {plan.price.toLocaleString('en-LK')}<small> / month</small></div>
            <div className="plan-count"><strong>{plan.count}</strong> subdomain{plan.count > 1 ? 's' : ''}</div>
            <div className="plan-divider" />
            <ul>{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
            <button className="choose-button" type="button" onClick={() => { setSelected(plan.name); apply(plan); }}>Choose this plan <span>↗</span></button>
          </article>)}
        </div>
        <p className="pricing-footnote">Prices are monthly package totals. www support is optional and adds LKR 50 per subdomain per month.</p>
      </section>

      <section className="how-section">
        <div className="how-heading"><p className="section-label">GET STARTED</p><h2>Three steps to get going.</h2></div>
        <div className="steps-grid">
          <div className="step"><span>01</span><h3>Choose a package</h3><p>Select the number of subdomains and decide whether you need www support.</p></div>
          <div className="step"><span>02</span><h3>Send your application</h3><p>Your email app opens with a prepared request. Add your details and preferred subdomain names.</p></div>
          <div className="step"><span>03</span><h3>We review your request</h3><p>The Apokolips team will contact you about availability, setup, and next steps.</p></div>
        </div>
      </section>

      <section className="examples-section">
        <div><p className="section-label">MAKE IT YOURS</p><h2>Ideas deserve good addresses.</h2><p>Request a name that suits your website, subject to availability.</p></div>
        <div className="domain-tags">{['yourname','myportfolio','mybusiness','shop','blog','project'].map(name => <span key={name}>{name}<b>.apokolips.xyz</b></span>)}</div>
      </section>

      <section className="important-note">
        <div className="note-icon">i</div>
        <div><h3>Before you apply</h3><p>These packages provide <strong>subdomains only</strong>. Website hosting, storage, and website files are not included. You must arrange your own hosting provider that supports custom domains. DNS connection and HTTPS availability depend on your hosting provider.</p><p>Choosing a package sends an application request only. It does not automatically activate a subdomain or complete a payment. Subdomain names are subject to availability and review.</p></div>
      </section>
      <footer className="plans-footer"><span>© {new Date().getFullYear()} APOKOLIPS</span><a href="https://apokolips.xyz/">BACK TO APOKOLIPS ↗</a><span>IDEAS BECOME SOMETHING REAL.</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('plans-react-root')).render(<App />);
