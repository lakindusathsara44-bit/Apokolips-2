import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const plans = [
  { name: 'Apokolips Go', tier: '01 / STARTER', count: 1, standard: 150, description: 'A simple starting point for one website, portfolio, or project.', features: ['1 custom subdomain', 'DNS connection guidance', 'Email application support'] },
  { name: 'Apokolips Plus', tier: '02 / CREATOR', count: 5, standard: 750, description: 'A flexible package for several websites and growing ideas.', features: ['5 custom subdomains', 'Organise multiple projects', 'DNS connection guidance'] },
  { name: 'Apokolips Pro', tier: '03 / PROFESSIONAL', count: 20, standard: 3000, description: 'More room for a collection of services, products, and projects.', features: ['20 custom subdomains', 'For multiple brands or projects', 'DNS connection guidance'], popular: true },
  { name: 'Apokolips Premium', tier: '04 / ADVANCED', count: 40, standard: 6000, description: 'Our largest package for managing a wider digital presence.', features: ['40 custom subdomains', 'For larger project collections', 'DNS connection guidance'] }
];
const examples = ['yourname', 'myportfolio', 'mybusiness', 'shop', 'blog', 'project'];

function App() {
  const [withWww, setWithWww] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState('');
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('apokolips-theme') === 'dark'; } catch { return false; }
  });
  const pricing = useMemo(() => plans.map(plan => ({ ...plan, price: plan.standard + (withWww ? plan.count * 50 : 0) })), [withWww]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('apokolips-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { elements.forEach(element => element.classList.add('is-visible')); return undefined; }
    document.documentElement.classList.add('reveal-enabled');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    elements.forEach(element => observer.observe(element));
    return () => { observer.disconnect(); document.documentElement.classList.remove('reveal-enabled'); };
  }, []);

  async function copyDomain(name) {
    const domain = name + '.apokolips.xyz';
    try { await navigator.clipboard.writeText(domain); setCopiedDomain(domain + ' copied'); }
    catch { setCopiedDomain('Copy is unavailable in this browser'); }
  }

  function apply(plan) {
    const option = withWww ? 'with www support' : 'without www support';
    const label = plan.name + ' - ' + plan.count + ' subdomain' + (plan.count > 1 ? 's' : '') + ' (' + option + ', LKR ' + plan.price.toLocaleString('en-LK') + '/month)';
    const subject = 'Plan Request - ' + plan.name;
    const body = 'Dear Apokolips Team,\n\nI would like to request the ' + label + ' plan. Please review my application and let me know the next steps.\n\nUSER DETAILS\nPlan: ' + label + '\nPreferred subdomain name(s): [Enter your preferred names]\nFull name: [Enter your full name]\nPhone / WhatsApp: [Enter your number]\nEmail: [Enter your email]\n\nPROJECT DETAILS\nWebsite or project description: [Tell us what you plan to build]\nHosting provider: [Enter your hosting provider]\n\nThank you.\n[Your name]';
    window.location.href = 'mailto:apokolips.contact@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  return <div className="plans-app">
    <main className="plans-container">
      <div className="plans-kicker"><a href="./index.html" className="back-home">← APOKOLIPS</a><span className="service-label">SUBDOMAIN PLANS</span>
        <button className="theme-toggle" type="button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}><span aria-hidden="true">{dark ? '☀' : '☾'}</span><span>{dark ? 'Light mode' : 'Dark mode'}</span></button>
      </div>

      <section className="pricing-section reveal" id="packages">
        <div className="pricing-heading">
          <div><p className="section-label">MONTHLY PACKAGES</p><h1>Choose your plan<span>.</span></h1><p className="pricing-subtitle">Select the number of subdomains that fits your project.</p></div>
          <div className="www-control">
            <div className="www-copy"><b>Include www support</b><small>Also configure www.yourname.apokolips.xyz</small></div>
            <button type="button" className={'switch ' + (withWww ? 'switch-on' : '')} role="switch" aria-checked={withWww} aria-label="Include www support" onClick={() => setWithWww(value => !value)}><span /></button>
          </div>
        </div>
        <div className="price-note" aria-live="polite">Showing {withWww ? 'packages with www support' : 'standard packages without www'} <span>·</span> www adds LKR 50 per subdomain / month</div>
        <div className="plan-cards">
          {pricing.map(plan => <article key={plan.name} className={'plan-card reveal ' + (plan.popular ? 'plan-popular' : '')}>
            {plan.popular && <div className="popular-label">POPULAR CHOICE</div>}
            <div className="plan-tier">{plan.tier}</div><h2>{plan.name}</h2><p className="plan-description">{plan.description}</p>
            <div className="plan-price"><span className="currency">LKR</span> {plan.price.toLocaleString('en-LK')}<small> / month</small></div>
            <div className="plan-count"><strong>{plan.count}</strong> subdomain{plan.count > 1 ? 's' : ''}</div>
            <div className="plan-divider" /><ul>{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
            <button className="choose-button" type="button" onClick={() => apply(plan)}>Choose this plan <span>↗</span></button>
          </article>)}
        </div>
        <p className="pricing-footnote">Prices are monthly package totals. www support is optional and adds LKR 50 per subdomain per month.</p>
      </section>

      <section className="how-section reveal">
        <div className="how-heading"><p className="section-label">APPLICATION PROCESS</p><h2>Three steps to get started.</h2></div>
        <div className="steps-grid">
          <article className="step"><span>01</span><h3>Choose a package</h3><p>Select the number of subdomains and decide whether you need www support.</p></article>
          <article className="step"><span>02</span><h3>Send your application</h3><p>Your email application includes the selected plan and fields for your contact and project details.</p></article>
          <article className="step"><span>03</span><h3>Availability review</h3><p>We review your preferred name and contact you about the next steps and DNS connection.</p></article>
        </div>
      </section>

      <section className="examples-section reveal">
        <div><p className="section-label">NAME IDEAS</p><h2>Make it yours.</h2><p>These are examples of how a subdomain could look. Select one to copy the address.</p></div>
        <div className="domain-tags">{examples.map(name => <button className="domain-tag" type="button" key={name} onClick={() => copyDomain(name)}>{name}<b>.apokolips.xyz</b><span>↗</span></button>)}</div>
        <p className="copy-status" aria-live="polite">{copiedDomain}</p>
      </section>

      <section className="faq-section reveal">
        <p className="section-label">COMMON QUESTIONS</p><h2>Before you apply.</h2>
        <details><summary>Does the package include website hosting?</summary><p>No. Packages provide subdomains only. You arrange your own hosting, storage, and website files.</p></details>
        <details><summary>Does choosing a plan activate my subdomain?</summary><p>No. It sends an application by email. The requested name is reviewed for availability before setup.</p></details>
        <details><summary>What does www support add?</summary><p>It includes configuration for an additional www-prefixed address and adds LKR 50 per subdomain per month.</p></details>
      </section>

      <section className="important-note reveal">
        <div className="note-icon">i</div><div><h3>Important information</h3>
          <p>These packages provide <strong>subdomains only</strong>. Website hosting, storage, and website files are not included. You must arrange your own hosting provider that supports custom domains. DNS connection and HTTPS availability depend on your hosting provider.</p>
          <p>Choosing a package sends an application request only. It does not automatically activate a subdomain or complete a payment. Subdomain names are subject to availability and review.</p>
        </div>
      </section>
      <footer className="plans-footer"><a href="./index.html">← BACK TO APOKOLIPS</a><span>© {new Date().getFullYear()} APOKOLIPS</span><span>IDEAS BECOME SOMETHING REAL.</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('plans-react-root')).render(<App />);
