import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const plans = [
  { name: 'Go', count: '1 subdomain', price: 'LKR 150', www: 'LKR 200' },
  { name: 'Plus', count: '5 subdomains', price: 'LKR 750', www: 'LKR 1,000' },
  { name: 'Pro', count: '20 subdomains', price: 'LKR 3,000', www: 'LKR 4,000' },
  { name: 'Premium', count: '40 subdomains', price: 'LKR 6,000', www: 'LKR 8,000' }
];

function App() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('apokolips-theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('apokolips-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  useEffect(() => {
    const elements = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="landing">
      <header className="site-header" data-reveal="down">
        <a className="brand" href="./index.html" aria-label="Apokolips home">
          <img className="brand-icon" src="./file_00000000a7ec820890154ca6ed49b608.ico" alt="" />
          <span>APOKOLIPS</span>
        </a>
        <button className="theme-toggle" type="button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
          <span aria-hidden="true">{dark ? '☀' : '☾'}</span><span>{dark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </header>

      <section className="landing-hero" data-reveal="hero" aria-labelledby="landing-title">
        <p className="eyebrow">SALES.APOKOLIPS.XYZ · WEBSITE PLATFORM</p>
        <h1 id="landing-title">Your ideas deserve<br /><span>a place online.</span></h1>
        <p className="intro">Apokolips is a website-building workspace where you can create, design, manage, and publish websites for your projects, services, business, or community.</p>
      </section>

      <section className="service-section" data-reveal aria-labelledby="platform-title">
        <div className="section-heading">
          <p className="section-label">WHAT YOU CAN DO</p>
          <h2 id="platform-title">From a blank page to your own website.</h2>
          <p>Use the visual editor to build pages without needing to write code. Arrange content, work with page elements, adjust layouts, preview your work, and publish a project when it is ready.</p>
        </div>
        <div className="service-grid">
          <article className="service-card" data-reveal style={{ '--reveal-delay': '0ms' }}><span>01</span><h3>Create pages</h3><p>Start a website project and build pages for your brand, service, portfolio, or information.</p></article>
          <article className="service-card" data-reveal style={{ '--reveal-delay': '90ms' }}><span>02</span><h3>Design your layout</h3><p>Arrange visual elements, edit content, and adjust page layouts for different screen sizes.</p></article>
          <article className="service-card" data-reveal style={{ '--reveal-delay': '180ms' }}><span>03</span><h3>Preview and publish</h3><p>Review your website and manage the publishing process for your project.</p></article>
        </div>
      </section>

      <section className="service-section audience-section" data-reveal aria-labelledby="audience-title">
        <div className="section-heading">
          <p className="section-label">WHO IT HELPS</p>
          <h2 id="audience-title">Useful for people and teams who need a website.</h2>
          <p>Apokolips can be useful for students presenting academic work, small businesses promoting their services, freelancers showing portfolios, educators sharing learning resources, and groups managing community information.</p>
        </div>
        <div className="audience-grid">
          {['Students & academic projects','Small businesses & services','Freelancers & portfolios','Teachers & education projects','Blogs & information sites','Clubs & community groups'].map((item, i) => <div className="audience-item" data-reveal style={{ '--reveal-delay': `${i * 55}ms` }} key={item}><span>{String(i + 1).padStart(2, '0')}</span>{item}</div>)}
        </div>
      </section>

      <section className="service-section purchase-section" data-reveal aria-labelledby="purchase-title">
        <div className="section-heading">
          <p className="section-label">WHAT YOU CAN PURCHASE</p>
          <h2 id="purchase-title">A subdomain address for your project.</h2>
          <p>Choose a monthly plan for a set number of project subdomains under the Apokolips domain. You can also request the www version at the listed price.</p>
        </div>
        <div className="plan-grid-home">
          {plans.map(plan => <article className="home-plan-card" data-reveal style={{ '--reveal-delay': `${plans.indexOf(plan) * 75}ms` }} key={plan.name}>
            <h3>{plan.name}</h3>
            <p className="home-plan-count">{plan.count}</p>
            <p className="home-plan-price">{plan.price}<small> / month</small></p>
            <p className="home-plan-www">With www: <strong>{plan.www} / month</strong></p>
            <a className="plan-link" href="./plans.html">View plan &amp; apply <span aria-hidden="true">↗</span></a>
          </article>)}
        </div>
        <p className="plan-disclaimer">Plans cover subdomain services only. Website hosting, storage, and website content management are not included. Applications are reviewed before setup.</p>
      </section>

      <section className="service-section access-section" data-reveal aria-labelledby="access-title">
        <div className="section-heading">
          <p className="section-label">GET STARTED</p>
          <h2 id="access-title">Choose where you want to go.</h2>
          <p>Explore the plans without signing in, or open the Editor when you are ready to work on a website.</p>
        </div>
        <div className="access-actions">
          <div className="access-option" data-reveal>
            <h3>Website Editor</h3>
            <p>Open your workspace to create and manage website projects. Signing in is required only when entering the Editor.</p>
            <a className="dev-button" href="./dev.html">Open Editor <span aria-hidden="true">↗</span></a>
          </div>
          <div className="access-option">
            <h3>Subdomain Plans</h3>
            <p>Compare all plan details and submit an application. You do not need to log in to view or apply.</p>
            <a className="plans-button" href="./plans.html">View all plans <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>

      <footer className="landing-footer"><span>© {new Date().getFullYear()} APOKOLIPS</span><span>IDEAS BECOME SOMETHING REAL.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
