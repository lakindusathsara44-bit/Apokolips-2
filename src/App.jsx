import { useEffect, useMemo, useState } from 'react';

const ICON = './file_00000000a7ec820890154ca6ed49b608.ico';
const VISITOR_KEY = 'apokolips_xyz_homepage_visitors_2026';
const VISITOR_API = 'https://countapi.mileshilliard.com/api/v1';

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
  { number: '04 / COMMUNITY', icon: '✧', title: 'Community Gallery', description: 'Explore creative work and contributions from the community.', href: 'project.gallery.html', action: 'EXPLORE GALLERY ↗' },
  { number: '05 / SERVICES', icon: '◇', title: 'Subdomain Plans', description: 'Explore Apokolips packages and submit an application by email.', href: 'plans.html', action: 'VIEW PLANS ↗' }
];

const quotes = [
  'Great things are built one small step at a time.',
  'Turn curiosity into experiments, and experiments into progress.',
  'Build with purpose. Improve with patience.',
  'Ideas become real when you give them consistent effort.',
  'Keep learning. Keep creating. Keep moving forward.'
];

function RainCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('rain');
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, drops = [], frame = 0;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: Math.max(35, Math.min(90, Math.floor(width / 10))) }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        len: 3 + Math.random() * 5, speed: .8 + Math.random() * 1.7,
        opacity: .25 + Math.random() * .4, travel: 0, limit: 90 + Math.random() * 180
      }));
    }
    function animate() {
      ctx.clearRect(0, 0, width, height);
      drops.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - .5, drop.y + drop.len);
        ctx.strokeStyle = 'rgba(170,205,255,' + drop.opacity + ')';
        ctx.lineWidth = 1.2;
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

function CommandPalette({ open, onClose, onInspire }) {
  const [query, setQuery] = useState('');
  const actions = [
    ...links.map(([label, href]) => ({ label, href, detail: 'Open page' })),
    { label: 'Inspire me', action: onInspire, detail: 'Show a fresh creative thought' },
    { label: 'Explore projects', action: () => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' }), detail: 'Jump to project cards' }
  ];
  const results = useMemo(
    () => actions.filter(item => item.label.toLowerCase().includes(query.toLowerCase())),
    [query, open]
  );
  useEffect(() => {
    if (open) {
      setQuery('');
      window.requestAnimationFrame(() => document.getElementById('command-search')?.focus());
    }
  }, [open]);
  if (!open) return null;
  return (
    <div className="command-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="command-panel" role="dialog" aria-modal="true" aria-labelledby="command-title">
        <div className="command-heading"><span id="command-title">QUICK LAUNCH</span><kbd>ESC</kbd></div>
        <input id="command-search" className="command-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pages and actions..." />
        <div className="command-results">
          {results.length ? results.map(item => (
            <a key={item.label} href={item.href || '#'} onClick={event => {
              if (item.action) { event.preventDefault(); item.action(); }
              onClose();
            }}>
              <span><strong>{item.label}</strong><small>{item.detail}</small></span><b>↗</b>
            </a>
          )) : <p className="command-empty">No matching actions found.</p>}
        </div>
        <div className="command-foot">Navigate with your mouse · <kbd>Ctrl</kbd> + <kbd>K</kbd> to search</div>
      </section>
    </div>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [roleIndex, setRoleIndex] = useState(0);
  const [toast, setToast] = useState('');
  const year = new Date().getFullYear();
  const roles = ['LEARNING', 'BUILDING', 'CREATING', 'EXPLORING'];

  const inspire = () => {
    setQuoteIndex(current => (current + 1 + Math.floor(Math.random() * (quotes.length - 1))) % quotes.length);
    setToast('A little inspiration for your next idea');
  };

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
      setShowTop(window.scrollY > 420);
    };
    const onKey = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(value => !value);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal-on-scroll');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(node => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12, rootMargin: '0px 0px -35px 0px' });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setRoleIndex(index => (index + 1) % roles.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const id = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const updateSpotlight = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    event.currentTarget.style.setProperty('--pointer-x', x + 'px');
    event.currentTarget.style.setProperty('--pointer-y', y + 'px');
    event.currentTarget.style.setProperty('--tilt-x', ((x / rect.width) - .5) * 5 + 'deg');
    event.currentTarget.style.setProperty('--tilt-y', ((.5 - y / rect.height) * 5) + 'deg');
  };

  return (
    <div className="app-shell">
      <div className="scroll-progress" style={{ transform: 'scaleX(' + progress / 100 + ')' }} aria-hidden="true" />
      <RainCanvas />
      <div className="hero-ambient" aria-hidden="true"><span /><span /><span /></div>
      <header className="topbar">
        <a className="brand" href="index.html"><span className="brand-mark"><img src={ICON} alt="Apokolips logo" /></span><span>APOKOLIPS</span></a>
        <div className="topbar-actions">
          <button className="launch-button" type="button" onClick={() => setPaletteOpen(true)}><span>⌕</span> Quick launch <kbd>Ctrl K</kbd></button>
          <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
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
        </div>
        <div className="hero-meta"><span>BASED IN SRI LANKA</span><span className="meta-line" /><span className="role-rotator" key={roleIndex}>{roles[roleIndex]}</span></div>
        <section className="inspiration-strip" aria-live="polite">
          <span className="inspiration-mark">✦</span>
          <p>{quotes[quoteIndex]}</p>
          <button type="button" onClick={inspire}>INSPIRE ME <span>↻</span></button>
        </section>
      </main>

      <section className="quick-grid" id="projects" aria-label="Explore Apokolips">
        {cards.map((card, index) => (
          <a className="quick-card reveal-on-scroll" href={card.href} key={card.href}
            style={{ '--reveal-delay': (index * 90) + 'ms' }}
            onPointerMove={updateSpotlight}
            onPointerLeave={event => {
              event.currentTarget.style.setProperty('--tilt-x', '0deg');
              event.currentTarget.style.setProperty('--tilt-y', '0deg');
            }}>
            <span className="card-index">{card.number}</span><span className="card-icon">{card.icon}</span>
            <h2>{card.title}</h2><p>{card.description}</p><span className="card-link">{card.action}</span>
          </a>
        ))}
      </section>

      <footer className="footer">
        <span>© {year} Lakindu Sathsara</span>
        <span>BUILT WITH CURIOSITY <span className="accent">●</span></span>
        <VisitorCounter />
      </footer>

      <button className={'back-to-top' + (showTop ? ' visible' : '')} type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</button>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onInspire={inspire} />
      <div className={'toast-message' + (toast ? ' visible' : '')} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
