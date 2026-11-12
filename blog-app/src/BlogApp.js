import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initLegacyBlog } from './legacyBlog.js';
import { supabaseClient } from './supabase.js';

const h = React.createElement;

const POSTS = [
  {
    id: 'travel-photo-20261016',
    slug: 'travel-memory-2026-10-16',
    title: 'A moment worth remembering',
    date: '2026-10-16',
    dateLabel: '16 October 2026',
    description: 'One of my captured moments. More travel memories will be added here.',
    src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0139.jpg',
    alt: 'Travel memory shared by Lakindu Sathsara',
    type: 'photo'
  },
  {
    id: 'travel-photo-20261016-wa0120',
    slug: 'travel-photo-20261016-wa0120',
    title: 'Another moment to remember',
    date: '2026-10-16',
    dateLabel: '16 October 2026',
    description: 'Another captured moment from the journey.',
    src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0120%281%29.jpg',
    alt: 'Additional travel photograph shared by Lakindu Sathsara',
    type: 'photo'
  },
  {
    id: 'travel-photo-20261110-wa0021',
    slug: 'travel-photo-2026-11-10-wa0021',
    title: 'A new moment to remember',
    date: '2026-11-10',
    dateLabel: '10 November 2026',
    description: 'Another captured moment, added to the Apokolips travel memories.',
    src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261110-WA0021.jpg',
    alt: 'Travel photograph shared by Lakindu Sathsara on 10 November 2026',
    type: 'photo'
  }
];

function RainCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('blogRain');
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, frame = 0, drops = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: Math.max(32, Math.min(85, Math.floor(width / 11))) }, () => ({
        x: Math.random() * width, y: Math.random() * height,
        len: 3 + Math.random() * 5, speed: .7 + Math.random() * 1.5,
        alpha: .18 + Math.random() * .36
      }));
    };
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      drops.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - .5, drop.y + drop.len);
        ctx.strokeStyle = 'rgba(160,205,255,' + drop.alpha + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        drop.y += drop.speed;
        if (drop.y > height + 8) { drop.y = -10; drop.x = Math.random() * width; }
      });
      frame = requestAnimationFrame(animate);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return h('canvas', { id: 'blogRain', className: 'blog-rain', 'aria-hidden': 'true' });
}

function PostCard({ post, index, onOpen, hidden }) {
  const onPointerMove = event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    event.currentTarget.style.setProperty('--card-x', (x * 100) + '%');
    event.currentTarget.style.setProperty('--card-y', (y * 100) + '%');
    event.currentTarget.style.setProperty('--card-rotate-x', ((.5 - y) * 3.5) + 'deg');
    event.currentTarget.style.setProperty('--card-rotate-y', ((x - .5) * 3.5) + 'deg');
  };
  const resetTilt = event => {
    event.currentTarget.style.setProperty('--card-rotate-x', '0deg');
    event.currentTarget.style.setProperty('--card-rotate-y', '0deg');
  };
  return h('article', {
    className: 'photo-post blog-post reveal-card',
    id: post.id,
    'data-post-slug': post.slug,
    'data-media-type': post.type,
    style: { display: hidden ? 'none' : undefined, '--card-delay': (index % 6 * 75) + 'ms' },
    onPointerMove,
    onPointerLeave: resetTilt
  },
    h('button', {
      className: 'post-image-button',
      type: 'button',
      onClick: () => onOpen(post),
      'aria-label': 'Open ' + post.title
    },
      h('img', { src: post.src, alt: post.alt, loading: 'lazy', decoding: 'async' }),
      h('span', { className: 'image-open-hint' }, 'VIEW MEMORY ↗'),
      h('span', { className: 'image-index' }, String(index + 1).padStart(2, '0'))
    ),
    h('div', { className: 'post-content' },
      h('h3', { className: 'post-title' }, post.title),
      h('div', { className: 'post-date' }, post.dateLabel + ' · Personal photo'),
      h('p', { className: 'post-description' }, post.description)
    )
  );
}

function Lightbox({ post, posts, onClose, onMove }) {
  useEffect(() => {
    if (!post) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onMove(1);
      if (event.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('lightbox-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('lightbox-open');
    };
  }, [post, onClose, onMove]);
  if (!post) return null;
  return h('div', { className: 'lightbox-backdrop', role: 'presentation', onMouseDown: e => { if (e.target === e.currentTarget) onClose(); } },
    h('section', { className: 'lightbox-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': post.title },
      h('button', { className: 'lightbox-close', type: 'button', onClick: onClose, 'aria-label': 'Close image viewer' }, '×'),
      h('button', { className: 'lightbox-arrow lightbox-prev', type: 'button', onClick: () => onMove(-1), 'aria-label': 'Previous photo' }, '‹'),
      h('img', { src: post.src, alt: post.alt }),
      h('button', { className: 'lightbox-arrow lightbox-next', type: 'button', onClick: () => onMove(1), 'aria-label': 'Next photo' }, '›'),
      h('div', { className: 'lightbox-caption' }, h('strong', null, post.title), h('span', null, post.dateLabel))
    )
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [layout, setLayout] = useState('grid');
  const [lightboxPost, setLightboxPost] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [stats, setStats] = useState({ reactions: '—', comments: '—' });
  const searchRef = useRef(null);
  const currentPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...POSTS].filter(post => {
      const matchesType = filter === 'all' || post.type === filter;
      const matchesQuery = !query || [post.title, post.description, post.dateLabel].join(' ').toLowerCase().includes(query);
      return matchesType && matchesQuery;
    }).sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  }, [search, filter, sort]);

  useEffect(() => {
    initLegacyBlog();
    let alive = true;
    const loadStats = async () => {
      const [reactions, comments] = await Promise.all([
        supabaseClient.from('apokolips_blog_reactions').select('id', { count: 'exact', head: true }),
        supabaseClient.from('apokolips_blog_comments').select('id', { count: 'exact', head: true })
      ]);
      if (!alive) return;
      setStats({
        reactions: reactions.error ? '—' : Number(reactions.count || 0).toLocaleString(),
        comments: comments.error ? '—' : Number(comments.count || 0).toLocaleString()
      });
    };
    loadStats();
    const channel = supabaseClient.channel('apokolips-blog-react-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apokolips_blog_reactions' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apokolips_blog_comments' }, loadStats)
      .subscribe();
    return () => {
      alive = false;
      supabaseClient.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, window.scrollY / max * 100) : 0);
      setShowTop(window.scrollY > 420);
    };
    const onKey = event => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('keydown', onKey);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal-card, .blog-reveal');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(node => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .1, rootMargin: '0px 0px -30px 0px' });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [currentPosts.length]);

  const openPost = post => setLightboxPost(post);
  const moveLightbox = direction => {
    if (!lightboxPost) return;
    const index = POSTS.findIndex(item => item.id === lightboxPost.id);
    setLightboxPost(POSTS[(index + direction + POSTS.length) % POSTS.length]);
  };
  const copyPageLink = async () => {
    const url = window.location.href.split('#')[0] + '#memories';
    try {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent('apokolips-blog-toast', { detail: 'Blog link copied to clipboard.' }));
    } catch (_) {
      window.prompt('Copy this blog link:', url);
    }
  };

  return h(React.Fragment, null,
    h('div', { className: 'blog-scroll-progress', style: { transform: 'scaleX(' + progress / 100 + ')' } }),
    h(RainCanvas),
    h('div', { className: 'blog-ambient blog-ambient-one' }),
    h('div', { className: 'blog-ambient blog-ambient-two' }),
    h('header', { className: 'topbar blog-topbar' },
      h('a', { className: 'brand', href: 'index.html' },
        h('span', { className: 'brand-mark' }, h('img', { src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/file_00000000a7ec820890154ca6ed49b608.png', alt: 'Apokolips logo' })),
        h('span', null, 'APOKOLIPS')
      ),
      h('div', { className: 'blog-topbar-right' },
        h('span', { className: 'blog-live-indicator' }, h('i'), ' LIVE JOURNAL'),
        h('button', { className: 'menu-toggle', type: 'button', onClick: () => setMenuOpen(v => !v), 'aria-expanded': menuOpen, 'aria-label': 'Toggle navigation' }, '☰')
      ),
      h('nav', { className: 'nav' + (menuOpen ? ' open' : ''), 'aria-label': 'Main navigation' },
        [['Home', 'index.html'], ['About Me', 'info.html'], ['Community Gallery', 'project.gallery.html'], ['My Projects', 'My-project.html']].map(([label, href]) =>
          h('a', { key: href, href, onClick: () => setMenuOpen(false) }, label)
        )
      )
    ),
    h('main', { className: 'page-shell blog-page-shell' },
      h('section', { className: 'blog-hero blog-reveal' },
        h('div', { className: 'blog-kicker' }, 'PERSONAL TRAVEL JOURNAL / 01'),
        h('h1', { className: 'blog-title' }, 'Places I’ve ', h('span', null, 'explored.')),
        h('p', { className: 'blog-intro' }, 'A collection of travel moments, photographs, and videos. Every journey has a story — this is where I keep mine.'),
        h('div', { className: 'blog-actions' },
          h('a', { href: 'info.html', className: 'blog-action-secondary' }, '← Back to About Me'),
          h('a', { href: '#memories', className: 'blog-action-primary' }, 'Explore memories ↓'),
          h('button', { type: 'button', className: 'blog-action-copy', onClick: copyPageLink }, '↗ Copy blog link')
        ),
        h('div', { className: 'blog-notification-tools' },
          h('button', { id: 'enableBlogNotifications', type: 'button' }, 'Enable notifications'),
          h('button', { id: 'blogNotificationBell', type: 'button', 'aria-expanded': 'false' }, 'Notifications ', h('span', { id: 'blogUnreadCount' }, '0')),
          h('span', { className: 'notification-status', id: 'blogNotificationStatus', role: 'status', 'aria-live': 'polite' }, 'Get alerts for replies and new photos.')
        ),
        h('div', { className: 'blog-notification-panel', id: 'blogNotificationPanel', hidden: true },
          h('div', { className: 'blog-notification-list', id: 'blogNotificationList' })
        )
      ),
      h('section', { className: 'blog-stats blog-reveal', 'aria-label': 'Blog activity' },
        h('div', null, h('span', null, 'MEMORIES'), h('strong', null, String(POSTS.length))),
        h('div', null, h('span', null, 'COMMUNITY REACTIONS'), h('strong', null, stats.reactions)),
        h('div', null, h('span', null, 'COMMENTS & REPLIES'), h('strong', null, stats.comments))
      ),
      h('section', { className: 'blog-section', id: 'memories' },
        h('div', { className: 'blog-section-heading blog-reveal' },
          h('div', null, h('div', { className: 'small-label' }, 'MY TRIPS'), h('h2', null, 'Photo & Video Memories')),
          h('span', { className: 'memory-count' }, String(currentPosts.length).padStart(2, '0') + ' / ' + String(POSTS.length).padStart(2, '0') + ' SHOWN')
        ),
        h('div', { className: 'blog-controls blog-reveal' },
          h('label', { className: 'blog-search-wrap' },
            h('span', { 'aria-hidden': 'true' }, '⌕'),
            h('input', { ref: searchRef, type: 'search', value: search, onChange: e => setSearch(e.target.value), placeholder: 'Search memories…', 'aria-label': 'Search memories' }),
            h('kbd', null, '/')
          ),
          h('div', { className: 'blog-control-group' },
            h('select', { value: filter, onChange: e => setFilter(e.target.value), 'aria-label': 'Filter media type' },
              h('option', { value: 'all' }, 'All media'),
              h('option', { value: 'photo' }, 'Photos'),
              h('option', { value: 'video' }, 'Videos')
            ),
            h('select', { value: sort, onChange: e => setSort(e.target.value), 'aria-label': 'Sort memories' },
              h('option', { value: 'newest' }, 'Newest first'),
              h('option', { value: 'oldest' }, 'Oldest first')
            ),
            h('button', { className: 'layout-toggle', type: 'button', onClick: () => setLayout(v => v === 'grid' ? 'list' : 'grid'), 'aria-label': layout === 'grid' ? 'Switch to list view' : 'Switch to grid view' }, layout === 'grid' ? '☷' : '▦')
          )
        ),
        h('div', { className: 'media-grid ' + (layout === 'list' ? 'media-grid-list' : ''), id: 'mediaGrid' },
          currentPosts.map((post, index) => h(PostCard, { key: post.id, post, index, onOpen: openPost, hidden: false }))
        ),
        currentPosts.length === 0 ? h('div', { className: 'empty-state blog-empty' }, h('div', { className: 'empty-icon' }, '✧'), h('h3', null, 'No matching memories'), h('p', null, 'Try another search or select a different media filter.')) : null,
        h('div', { className: 'blog-end-note' }, h('span', null, '✦'), ' More journeys. More stories. More to come.')
      )
    ),
    h('footer', { className: 'footer blog-footer' },
      h('span', null, '© ' + new Date().getFullYear() + ' Lakindu Sathsara'),
      h('span', null, h('a', { href: 'index.html' }, 'BACK TO HOME ↑'))
    ),
    h('button', { className: 'back-to-top blog-back-top' + (showTop ? ' visible' : ''), type: 'button', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), 'aria-label': 'Back to top' }, '↑'),
    h(Lightbox, { post: lightboxPost, posts: POSTS, onClose: () => setLightboxPost(null), onMove: moveLightbox })
  );
}

export default App;
