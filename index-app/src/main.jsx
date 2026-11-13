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
        <nav className="header-actions" aria-label="Main actions">
          <a className="dev-button" href="./dev.html">Open Dev workspace <span aria-hidden="true">↗</span></a>
          <button className="theme-toggle" type="button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
            <span aria-hidden="true">{dark ? '☀' : '☾'}</span><span>{dark ? 'Light mode' : 'Dark mode'}</span>
          </button>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="eyebrow">APOKOLIPS WEBSITE PLATFORM</p>
        <h1 id="landing-title">Ideas become<br /><span>something real.</span></h1>
        <p className="intro">Create, manage, and publish your website projects with the Apokolips platform.</p>
        <a className="dev-button hero-dev-button" href="./dev.html">Go to Dev workspace <span aria-hidden="true">↗</span></a>
      </section>

      <section className="service-section" aria-labelledby="service-title">
        <div className="section-heading">
          <p className="section-label">THE PLATFORM</p>
          <h2 id="service-title">A practical workspace for your next idea.</h2>
          <p>Start a website project, edit its pages visually, and manage publication from one dedicated workspace.</p>
        </div>
        <div className="service-grid">
          <article className="service-card"><span>01</span><h3>Create a website</h3><p>Start a project and choose its public website address.</p></article>
          <article className="service-card"><span>02</span><h3>Design visually</h3><p>Build pages with the visual editor, responsive layouts, and reusable components.</p></article>
          <article className="service-card"><span>03</span><h3>Publish your project</h3><p>Manage your website draft and publish it when it is ready.</p></article>
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
          <p className="section-label">GET STARTED</p>
          <h2 id="process-title">From a first draft to a published website.</h2>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Open Dev</h3><p>Sign in or create your Apokolips account.</p></div></li>
          <li><span>02</span><div><h3>Create a project</h3><p>Set a project name and its unique website address.</p></div></li>
          <li><span>03</span><div><h3>Build and publish</h3><p>Use the visual editor, preview your pages, and publish when ready.</p></div></li>
        </ol>
        <div className="closing-cta">
          <div><p className="section-label">READY TO BUILD?</p><h2>Start your website project in Dev.</h2></div>
          <a className="dev-button" href="./dev.html">Open Dev workspace <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="landing-footer"><span>© {new Date().getFullYear()} APOKOLIPS</span><span>IDEAS BECOME SOMETHING REAL.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
