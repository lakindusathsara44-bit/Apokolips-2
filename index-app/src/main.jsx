import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="landing">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="landing-content">
        <img className="brand-icon" src="./file_00000000a7ec820890154ca6ed49b608.ico" alt="Apokolips" />
        <p className="eyebrow">APOKOLIPS / SUBDOMAIN SERVICES</p>
        <h1>Ideas become<br /><span>something real.</span></h1>
        <p className="intro">Give your website, business, portfolio, or next project its own address.</p>
        <a className="plans-button" href="./plans.html">Subdomain Plans <span aria-hidden="true">↗</span></a>
      </section>
      <footer>© {new Date().getFullYear()} APOKOLIPS</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
