import { useEffect, useMemo, useState } from 'react';
import { initBlogInteractions } from './blog-interactions.js';
import './blog.css';

const ICON = 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/file_00000000a7ec820890154ca6ed49b608.png';

const POSTS = [
  {
    id: 'travel-photo-20261016',
    slug: 'travel-memory-2026-10-16',
    title: 'A moment worth remembering',
    date: '2026-10-16',
    dateLabel: '16 October 2026 · Personal photo',
    description: 'One of my captured moments. More travel memories will be added here.',
    image: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0139.jpg',
    alt: 'Travel memory shared by Lakindu Sathsara',
    type: 'photo'
  },
  {
    id: 'travel-photo-20261016-wa0120',
    slug: 'travel-photo-20261016-wa0120',
    title: 'Another moment to remember',
    date: '2026-10-16',
    dateLabel: '16 October 2026 · Personal photo',
    description: 'Another captured moment from the journey.',
    image: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0120%281%29.jpg',
    alt: 'Additional travel photograph shared by Lakindu Sathsara',
    type: 'photo'
  },
  {
    id: 'travel-photo-20261110-wa0021',
    slug: 'travel-photo-2026-11-10-wa0021',
    title: 'A new moment to remember',
    date: '2026-11-10',
    dateLabel: '10 November 2026 · Personal photo',
    description: 'Another captured moment, added to the Apokolips travel memories.',
    image: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261110-WA0021.jpg',
    alt: 'Travel photograph shared by Lakindu Sathsara on 10 November 2026',
    type: 'photo'
  }
];

function MechanicalIntro() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(false);
      return undefined;
    }
    const startedAt = performance.now();
    let finishTimer;
    let removeTimer;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setProgress(100);
      finishTimer = window.setTimeout(() => {
        setExiting(true);
        removeTimer = window.setTimeout(() => setVisible(false), 500);
      }, Math.max(0, 7500 - (performance.now() - startedAt)));
    };
    const update = () => {
      if (document.readyState === 'interactive') setProgress(value => Math.max(value, 58));
      if (document.readyState === 'complete') finish();
    };
    document.addEventListener('readystatechange', update);
    window.addEventListener('load', finish, { once: true });
    update();
    return () => {
      document.removeEventListener('readystatechange', update);
      window.removeEventListener('load', finish);
      window.clearTimeout(finishTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;
  return (
    <div className={'mechanical-intro' + (exiting ? ' is-exiting' : '')} role="status" aria-label="Apokolips blog is loading">
      <div className="intro-grid" />
      <div className="intro-corner intro-corner-tl" />
      <div className="intro-corner intro-corner-br" />
      <div className="intro-machine">
        <div className="intro-orbit intro-orbit-one" />
        <div className="intro-orbit intro-orbit-two" />
        <div className="intro-gear intro-gear-large"><span />{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</div>
        <div className="intro-gear intro-gear-small"><span />{Array.from({ length: 5 }, (_, i) => <i key={i} />)}</div>
        <div className="intro-arm intro-arm-top"><i /><b /></div>
        <div className="intro-arm intro-arm-right"><i /><b /></div>
        <div className="intro-arm intro-arm-bottom"><i /><b /></div>
        <div className="intro-arm intro-arm-left"><i /><b /></div>
        <div className="intro-core"><img src={ICON} alt="Apokolips icon" /><span /></div>
        <div className="intro-scanline" />
      </div>
      <div className="intro-brand">APOKOLIPS</div>
      <div className="intro-subtitle">BLOG SYSTEMS · ONLINE</div>
      <div className="intro-progress"><span style={{ width: progress + '%' }} /></div>
      <div className="intro-status"><span>{progress === 100 ? 'SYSTEM READY' : 'LOADING RESOURCES'}</span><strong>{progress}%</strong></div>
    </div>
  );
}

function RainCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('rain');
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let drops = [];
    let frame = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drops = Array.from({ length: Math.max(35, Math.min(90, Math.floor(width / 10))) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        length: 3 + Math.random() * 5,
        speed: 0.8 + Math.random() * 1.7,
        opacity: 0.2 + Math.random() * 0.35,
        travel: 0,
        limit: 90 + Math.random() * 180
      }));
    };
    const animate = () => {
      context.clearRect(0, 0, width, height);
      drops.forEach(drop => {
        context.beginPath();
        context.moveTo(drop.x, drop.y);
        context.lineTo(drop.x - 0.5, drop.y + drop.length);
        context.strokeStyle = 'rgba(170,205,255,' + drop.opacity + ')';
        context.lineWidth = 1.1;
        context.stroke();
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
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (!reduced) animate();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return <canvas id="rain" aria-hidden="true" />;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [lightboxSlug, setLightboxSlug] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return POSTS
      .filter(post => filter === 'all' || post.type === filter)
      .filter(post => !normalized || [post.title, post.description, post.dateLabel].join(' ').toLowerCase().includes(normalized))
      .sort((a, b) => sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  }, [query, filter, sort]);

  const activeIndex = visiblePosts.findIndex(post => post.slug === lightboxSlug);
  const activePost = activeIndex >= 0 ? visiblePosts[activeIndex] : null;

  useEffect(() => initBlogInteractions(), []);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(100, window.scrollY / max * 100) : 0);
      setShowTop(window.scrollY > 420);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal-on-scroll');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      nodes.forEach(node => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [visiblePosts.length]);

  useEffect(() => {
    if (!activePost) return undefined;
    const onKeyDown = event => {
      if (event.key === 'Escape') setLightboxSlug(null);
      if (event.key === 'ArrowRight' && visiblePosts.length > 1) setLightboxSlug(visiblePosts[(activeIndex + 1) % visiblePosts.length].slug);
      if (event.key === 'ArrowLeft' && visiblePosts.length > 1) setLightboxSlug(visiblePosts[(activeIndex - 1 + visiblePosts.length) % visiblePosts.length].slug);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [activePost, activeIndex, visiblePosts]);

  const moveLightbox = direction => {
    if (!visiblePosts.length) return;
    const next = (activeIndex + direction + visiblePosts.length) % visiblePosts.length;
    setLightboxSlug(visiblePosts[next].slug);
  };

  return (
    <div className="blog-page">
      <MechanicalIntro />
      <div className="blog-scroll-progress" aria-hidden="true"><span style={{ width: scrollProgress + '%' }} /></div>
      <RainCanvas />

      <header className="topbar">
        <a className="brand" href="index.html">
          <span className="brand-mark"><img src={ICON} alt="" /></span>
          <span>APOKOLIPS</span>
        </a>
        <button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>☰</button>
        <nav className={'nav' + (menuOpen ? ' open' : '')} aria-label="Main navigation">
          <a href="index.html" onClick={() => setMenuOpen(false)}>Home</a>
          <a href="info.html" onClick={() => setMenuOpen(false)}>About Me</a>
          <a href="project.gallery.html" onClick={() => setMenuOpen(false)}>Community Gallery</a>
          <a href="My-project.html" onClick={() => setMenuOpen(false)}>My Projects</a>
          <a className="active" href="blog.html" onClick={() => setMenuOpen(false)}>Travel Blog</a>
        </nav>
      </header>

      <main className="page-shell">
        <section className="blog-hero">
          <div className="blog-kicker"><span className="blog-live-dot" /> PERSONAL TRAVEL JOURNAL / 01</div>
          <h1 className="blog-title">Places I've <span>explored.</span></h1>
          <p className="blog-intro">A collection of travel moments, photographs, and videos. Every journey has a story — this is where I keep mine.</p>
          <div className="blog-actions">
            <a href="info.html">← Back to About Me</a>
            <a href="#memories">Explore memories ↓</a>
          </div>

          <div className="blog-notification-tools">
            <button id="enableBlogNotifications" type="button">Enable notifications</button>
            <button id="blogNotificationBell" type="button" aria-expanded="false" aria-controls="blogNotificationPanel">Notifications <span id="blogUnreadCount">0</span></button>
            <span className="notification-status" id="blogNotificationStatus" role="status" aria-live="polite">Get alerts for replies and new photos.</span>
          </div>
          <div className="blog-notification-panel" id="blogNotificationPanel" hidden>
            <div className="blog-notification-list" id="blogNotificationList" />
          </div>
        </section>

        <section className="blog-section" id="memories">
          <div className="blog-section-heading reveal-on-scroll">
            <div><div className="small-label">MY TRIPS / ARCHIVE</div><h2>Photo &amp; Video Memories</h2></div>
            <span className="blog-post-total">{visiblePosts.length} / {POSTS.length} memories</span>
          </div>

          <div className="blog-controls reveal-on-scroll">
            <label className="blog-search">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search memories..." aria-label="Search memories" />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
            </label>
            <div className="blog-filter-group" aria-label="Filter memories">
              {['all', 'photo', 'video'].map(value => (
                <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>
                  {value === 'all' ? 'All' : value === 'photo' ? 'Photos' : 'Videos'}
                </button>
              ))}
            </div>
            <label className="blog-sort">
              <span>Sort</span>
              <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort memories">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>

          {visiblePosts.length ? (
            <div className="blog-post-grid">
              {visiblePosts.map((post, index) => (
                <article
                  className="photo-post reveal-on-scroll"
                  id={post.id}
                  data-post-slug={post.slug}
                  key={post.slug}
                  style={{ '--post-order': index }}
                  onPointerMove={event => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    event.currentTarget.style.setProperty('--spot-x', (event.clientX - rect.left) + 'px');
                    event.currentTarget.style.setProperty('--spot-y', (event.clientY - rect.top) + 'px');
                  }}
                >
                  <button className="blog-image-open" type="button" onClick={() => setLightboxSlug(post.slug)} aria-label={'Open image: ' + post.title}>
                    <img src={post.image} alt={post.alt} loading="lazy" />
                    <span className="blog-image-zoom">VIEW IMAGE ↗</span>
                  </button>
                  <div className="post-content">
                    <div className="blog-post-meta"><span>PHOTO MEMORY</span><span>{String(index + 1).padStart(2, '0')}</span></div>
                    <h3 className="post-title">{post.title}</h3>
                    <div className="post-date">{post.dateLabel}</div>
                    <p className="post-description">{post.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state blog-empty-state">
              <div className="empty-icon">{filter === 'video' ? '▶' : '⌕'}</div>
              <h3>{filter === 'video' ? 'No videos here yet' : 'No matching memories'}</h3>
              <p>{filter === 'video' ? 'Video memories will appear here when they are added to the blog.' : 'Try another search or clear the current filter.'}</p>
              <button type="button" className="blog-reset-button" onClick={() => { setQuery(''); setFilter('all'); }}>Show all memories</button>
            </div>
          )}

          <div className="media-grid" id="mediaGrid" />
          <div className="empty-state" id="emptyState" hidden>
            <div className="empty-icon">✧</div><h3>No more travel memories yet</h3>
            <p>This space is ready for future trips. Photos and videos will appear here when they are uploaded to the GitHub repository.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} Lakindu Sathsara</span>
        <span><a href="index.html">BACK TO HOME ↑</a></span>
      </footer>

      {showTop && <button className="blog-top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>}

      {activePost && (
        <div className="blog-lightbox" role="presentation" onClick={event => { if (event.target === event.currentTarget) setLightboxSlug(null); }}>
          <button className="blog-lightbox-close" type="button" onClick={() => setLightboxSlug(null)} aria-label="Close image viewer">×</button>
          {visiblePosts.length > 1 && <button className="blog-lightbox-arrow previous" type="button" onClick={() => moveLightbox(-1)} aria-label="Previous image">‹</button>}
          <figure className="blog-lightbox-figure">
            <img src={activePost.image} alt={activePost.alt} />
            <figcaption><strong>{activePost.title}</strong><span>{activePost.dateLabel}</span></figcaption>
          </figure>
          {visiblePosts.length > 1 && <button className="blog-lightbox-arrow next" type="button" onClick={() => moveLightbox(1)} aria-label="Next image">›</button>}
        </div>
      )}
    </div>
  );
}
