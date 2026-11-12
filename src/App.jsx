import { useEffect, useState } from 'react';

const ICON = '/file_00000000a7ec820890154ca6ed49b608.ico';
const VISITOR_KEY = 'apokolips_xyz_homepage_visitors_2026';
const VISITOR_API = 'https://countapi.mileshilliard.com/api/v1';

function RainCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('rain');
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let drops = [];
    let frame = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const amount = Math.max(45, Math.min(110, Math.floor(width / 8)));
      drops = Array.from({ length: amount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        length: 3 + Math.random() * 5,
        speed: 0.8 + Math.random() * 1.7,
        opacity: 0.35 + Math.random() * 0.5,
        travel: 0,
        limit: 90 + Math.random() * 180
      }));
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      drops.forEach((drop) => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 0.5, drop.y + drop.length);
        ctx.strokeStyle = 'rgba(170,205,255,' + drop.opacity + ')';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        drop.y += drop.speed;
        drop.travel += drop.speed;
        if (drop.travel >= drop.limit || drop.y > height + 10) {
          drop.x = Math.random() * width;
          drop.y = -Math.random() * 35;
          drop.travel = 0;
          drop.limit = 90 + Math.random() * 180;
        }
      });
      frame = window.requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas id="rain" aria-hidden="true" />;
}

function VisitorCounter() {
  const [count, setCount] = useState('128');
  useEffect(() => {
    let active = true;
    async function request(action) {
      const response = await fetch(VISITOR_API + '/' + action + '/' + VISITOR_KEY, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.error || 'Visitor counter request failed');
        error.status = response.status;
        throw error;
      }
      return data;
    }
    async function update() {
      let counted = false;
      try { counted = sessionStorage.getItem('apokolips_home_visit_counted') === '1'; } catch (_) {}
      try {
        if (!counted) {
          try { await request('get'); }
          catch (error) {
            if (error.status !== 404) throw error;
            const response = await fetch(VISITOR_API + '/set/' + VISITOR_KEY + '?value=128', { cache: 'no-store' });
            if (!response.ok) throw new Error('Could not initialize visitor counter');
          }
          const result = await request('hit');
          try { sessionStorage.setItem('apokolips_home_visit_counted', '1'); } catch (_) {}
          if (active) setCount(Number(result.value).toLocaleString());
        } else {
          const result = await request('get');
          if (active) setCount(Number(result.value).toLocaleString());
        }
      } catch (error) {
        console.error('Apokolips visitor counter:', error);
        if (active) setCount('—');
      }
    }
    update();
    return () => { active = false; };
  }, []);
  return <span className="visitor-counter" aria-label="Apokolips visitor count"><span>VISITORS</span><strong>{count}</strong></span>;
}

const links = [
  ['Home', 'index.html'],
  ['About Me', 'info.html'],
  ['Community Gallery', 'project.gallery.html'],
  ['My Projects', 'My-project.html'],
  ['Code Editor', 'editor.html'],
  ['Subdomain Plans', 'plans.html']
];

const cards = [
  { number: '01 / PROFILE', icon: '◈', title: 'About Me', description: 'Personal details, contact information, interests, and ideas.', href: 'info.html', action: 'VIEW PROFILE ↗' },
  { number: '02 / WORK', icon: '⌘', title: 'My Projects', description: 'A growing collection of applications, concepts, and experiments.', href: 'My-project.html', action: 'OPEN PROJECT HUB ↗' },
  { number: '03 / CREATE', icon: '⌘', title: 'Code Editor', description: 'Write code with smart suggestions and run web projects in a live preview.', href: 'editor.html', action: 'START CODING ↗' },
  { number: '04 / SUBDOMAIN SERVICES', icon: '⌘', title: 'Subdomain Plans', description: 'Explore Apokolips subdomain packages and submit an application by email.', href: 'plans.html', action: 'VIEW PLANS ↗' }
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const year = new Date().getFullYear();
  return <>
    <RainCanvas />
    <header className="topbar">
      <a className="brand" href="index.html">
        <span className="brand-mark"><img src={ICON} alt="Apokolips logo" /></span>
        <span>APOKOLIPS</span>
      </a>
      <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      <nav className={'nav' + (menuOpen ? ' open' : '')} aria-label="Main navigation">
        {links.map(([label, href], index) => <a key={href} className={index === 0 ? 'active' : ''} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
      </nav>
    </header>
    <main className="hero-wrap">
      <div className="eyebrow"><span className="status-dot" /> PERSONAL PORTFOLIO &amp; PROJECT HUB</div>
      <h1>Ideas become<br /><span className="gradient-text">something real.</span></h1>
      <p className="hero-copy">Welcome to my personal space — a place to explore who I am, discover my ideas, view my projects, and explore my work.</p>
      <div className="hero-actions">
        <a className="btn btn-primary" href="My-project.html">Explore Projects <span>↗</span></a>
        <a className="btn btn-ghost" href="editor.html">Open Code Editor <span>↗</span></a>
        <a className="btn btn-ghost" href="project.gallery.html">Community Gallery <span>↗</span></a>
        <a className="btn btn-ghost" href="info.html">Get to know me</a>
      </div>
      <div className="hero-meta"><span>BASED IN SRI LANKA</span><span className="meta-line" /><span>LEARNING · BUILDING · CREATING</span></div>
    </main>
    <section className="quick-grid" aria-label="Explore Apokolips">
      {cards.map(card => <a className="quick-card" href={card.href} key={card.href}>
        <span className="card-index">{card.number}</span><span className="card-icon">{card.icon}</span>
        <h2>{card.title}</h2><p>{card.description}</p><span className="card-link">{card.action}</span>
      </a>)}
    </section>
    <footer className="footer">
      <span>© {year} Lakindu Sathsara</span>
      <span>BUILT WITH CURIOSITY <span className="accent">●</span></span>
      <VisitorCounter />
    </footer>
  </>;
}
