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
      <button className="theme-toggle" type="button" onClick={() => setDark(value => !value)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} aria-pressed={dark}>
        <span aria-hidden="true">{dark ? '☀' : '☾'}</span><span>{dark ? 'Light mode' : 'Dark mode'}</span>
      </button>
      <section className="landing-content" aria-labelledby="landing-title">
        <img className="brand-icon" src="./file_00000000a7ec820890154ca6ed49b608.ico" alt="Apokolips" />
        <p className="eyebrow">APOKOLIPS / SUBDOMAIN SERVICES</p>
        <h1 id="landing-title">Ideas become<br /><span>something real.</span></h1>
        <p className="intro">Give your website, business, portfolio, or next project its own address.</p>
        <a className="plans-button" href="./plans.html">Subdomain Plans <span aria-hidden="true">↗</span></a>
      </section>
      <footer>© {new Date().getFullYear()} APOKOLIPS</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);