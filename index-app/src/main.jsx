import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('apokolips-theme') === 'dark'; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('apokolips-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  return (
    <main className="landing">
      <header className="site-header">
        <a className="brand" href="./index.html" aria-label="Apokolips home">
          <img className="brand-icon" src="./file_00000000a7ec820890154ca6ed49b608.ico" alt="" />
          <span>APOKOLIPS</span>
        </a>
        <button className="theme-toggle" type="button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
          <span aria-hidden="true">{dark ? '☀' : '☾'}</span><span>{dark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="eyebrow">WEBSITE SUBDOMAIN SERVICE</p>
        <h1 id="landing-title">Ideas become<br /><span>something real.</span></h1>
        <p className="intro">Give your website, business, portfolio, or project a clear and memorable address with an Apokolips.xyz subdomain.</p>
        <a className="plans-button" href="./plans.html">Explore plans <span aria-hidden="true">↗</span></a>
      </section>

      <section className="service-section" aria-labelledby="service-title">
        <div className="section-heading">
          <p className="section-label">THE SERVICE</p>
          <h2 id="service-title">A simple address for your next idea.</h2>
          <p>Apokolips provides custom subdomains under apokolips.xyz, helping your project establish a clear place on the web.</p>
        </div>
        <div className="service-grid">
          <article className="service-card"><span>01</span><h3>Your own subdomain</h3><p>Choose an available name such as <b>yourname.apokolips.xyz</b> for your website or project.</p></article>
          <article className="service-card"><span>02</span><h3>Use your own hosting</h3><p>Connect the subdomain to a hosting provider that supports custom domains. Your hosting remains under your control.</p></article>
          <article className="service-card"><span>03</span><h3>Connection guidance</h3><p>Get guidance for the DNS connection process. HTTPS availability depends on your hosting provider.</p></article>
        </div>
      </section>

      <section className="service-section audience-section" aria-labelledby="audience-title">
        <div className="section-heading">
          <p className="section-label">WHO IT IS FOR</p>
          <h2 id="audience-title">Built for different kinds of projects.</h2>
        </div>
        <div className="audience-grid">
          {['University projects','Small businesses','Personal portfolios','Education websites','Blogs & information sites','Community projects'].map((item, i) => <div className="audience-item" key={item}><span>{String(i + 1).padStart(2, '0')}</span>{item}</div>)}
        </div>
      </section>

      <section className="service-section process-section" aria-labelledby="process-title">
        <div className="section-heading">
          <p className="section-label">HOW IT WORKS</p>
          <h2 id="process-title">From a name to an online address.</h2>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Choose a plan</h3><p>Compare the available monthly packages and select the capacity you need.</p></div></li>
          <li><span>02</span><div><h3>Send your request</h3><p>Submit your preferred subdomain name and project details by email.</p></div></li>
          <li><span>03</span><div><h3>Review and connect</h3><p>After availability review, follow the DNS guidance to connect your own hosting.</p></div></li>
        </ol>
        <div className="closing-cta">
          <div><p className="section-label">READY TO GET STARTED?</p><h2>Find the right plan for your project.</h2></div>
          <a className="plans-button" href="./plans.html">View subdomain plans <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="landing-footer"><span>© {new Date().getFullYear()} APOKOLIPS</span><span>IDEAS BECOME SOMETHING REAL.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
