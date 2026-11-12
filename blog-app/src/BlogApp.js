import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient, visitorId, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase.js';

const h = React.createElement;
const REACTIONS = [
  { type: 'like', label: '👍 Like' },
  { type: 'love', label: '❤️ Love' },
  { type: 'wow', label: '😍 Wow' },
  { type: 'fire', label: '🔥 Fire' }
];
const POSTS = [
  { id: 'travel-photo-20261016', slug: 'travel-memory-2026-10-16', title: 'A moment worth remembering', date: '2026-10-16', dateLabel: '16 October 2026', description: 'One of my captured moments. More travel memories will be added here.', src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0139.jpg', alt: 'Travel memory shared by Lakindu Sathsara', type: 'photo' },
  { id: 'travel-photo-20261016-wa0120', slug: 'travel-photo-20261016-wa0120', title: 'Another moment to remember', date: '2026-10-16', dateLabel: '16 October 2026', description: 'Another captured moment from the journey.', src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0120%281%29.jpg', alt: 'Additional travel photograph shared by Lakindu Sathsara', type: 'photo' },
  { id: 'travel-photo-20261110-wa0021', slug: 'travel-photo-2026-11-10-wa0021', title: 'A new moment to remember', date: '2026-11-10', dateLabel: '10 November 2026', description: 'Another captured moment, added to the Apokolips travel memories.', src: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261110-WA0021.jpg', alt: 'Travel photograph shared by Lakindu Sathsara on 10 November 2026', type: 'photo' }
];

function RainCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('blogRain');
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, frame = 0, drops = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: Math.max(32, Math.min(85, Math.floor(width / 11))) }, () => ({
        x: Math.random() * width, y: Math.random() * height, len: 3 + Math.random() * 5,
        speed: .7 + Math.random() * 1.5, alpha: .18 + Math.random() * .36
      }));
    };
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      drops.forEach(drop => {
        ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - .5, drop.y + drop.len);
        ctx.strokeStyle = 'rgba(160,205,255,' + drop.alpha + ')'; ctx.lineWidth = 1; ctx.stroke();
        drop.y += drop.speed;
        if (drop.y > height + 8) { drop.y = -10; drop.x = Math.random() * width; }
      });
      frame = requestAnimationFrame(animate);
    };
    resize(); window.addEventListener('resize', resize, { passive: true });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);
  return h('canvas', { id: 'blogRain', className: 'blog-rain', 'aria-hidden': 'true' });
}

function getSavedName() {
  try { return localStorage.getItem('apokolips-blog-device-name-v1') || ''; } catch (_) { return ''; }
}
function saveDeviceName(value) {
  try { localStorage.setItem('apokolips-blog-device-name-v1', value); } catch (_) {}
}
function formatDate(value) {
  return new Date(value).toLocaleString();
}
function setCommentTree(comments) {
  const replies = new Map();
  comments.filter(item => item.parent_comment_id).forEach(item => {
    const group = replies.get(item.parent_comment_id) || [];
    group.push(item); replies.set(item.parent_comment_id, group);
  });
  return comments.filter(item => !item.parent_comment_id).map(item => ({ ...item, replies: replies.get(item.id) || [] }));
}

function SocialCard({ post }) {
  const [counts, setCounts] = useState({ like: 0, love: 0, wow: 0, fire: 0 });
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [name, setName] = useState(getSavedName());
  const [body, setBody] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('Loading shared activity…');
  const [busy, setBusy] = useState(false);

  const loadReactions = async () => {
    const { data, error } = await supabaseClient.from('apokolips_blog_reactions')
      .select('reaction,visitor_id').eq('post_slug', post.slug);
    if (error) throw error;
    const next = { like: 0, love: 0, wow: 0, fire: 0 };
    let mine = null;
    (data || []).forEach(row => {
      if (next[row.reaction] !== undefined) next[row.reaction] += 1;
      if (row.visitor_id === visitorId) mine = row.reaction;
    });
    setCounts(next); setSelected(mine);
  };
  const loadComments = async () => {
    const { data, error } = await supabaseClient.from('apokolips_blog_comments')
      .select('id,parent_comment_id,visitor_id,display_name,body,created_at')
      .eq('post_slug', post.slug).order('created_at', { ascending: true }).limit(200);
    if (error) throw error;
    const rows = data || [];
    setComments(setCommentTree(rows));
    if (!name && rows.length) {
      const own = rows.find(item => item.visitor_id === visitorId);
      if (own?.display_name) { setName(own.display_name); saveDeviceName(own.display_name); }
    }
  };
  const refresh = async () => {
    try { await Promise.all([loadReactions(), loadComments()]); setStatus('Live · Shared with everyone'); }
    catch (error) { console.warn('Blog activity load failed:', error); setStatus('Could not load shared activity. Refresh and try again.'); }
  };
  useEffect(() => {
    refresh();
    const channel = supabaseClient.channel('blog-social-' + post.slug)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apokolips_blog_reactions', filter: 'post_slug=eq.' + post.slug }, loadReactions)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apokolips_blog_comments', filter: 'post_slug=eq.' + post.slug }, loadComments)
      .subscribe();
    return () => { supabaseClient.removeChannel(channel); };
  }, [post.slug]);

  const reactToPost = async type => {
    if (busy || selected === type) return;
    setBusy(true);
    try {
      const { data: updated, error: updateError } = await supabaseClient.from('apokolips_blog_reactions')
        .update({ reaction: type }).eq('post_slug', post.slug).eq('visitor_id', visitorId).select('id');
      if (updateError) throw updateError;
      if (!updated?.length) {
        const { error } = await supabaseClient.from('apokolips_blog_reactions')
          .insert({ post_slug: post.slug, visitor_id: visitorId, reaction: type });
        if (error && error.code === '23505') {
          const retry = await supabaseClient.from('apokolips_blog_reactions')
            .update({ reaction: type }).eq('post_slug', post.slug).eq('visitor_id', visitorId);
          if (retry.error) throw retry.error;
        } else if (error) throw error;
      }
      await loadReactions(); setStatus('Your reaction has been shared.');
    } catch (error) { console.error(error); setStatus('Reaction could not be saved. Please try again.'); }
    finally { setBusy(false); }
  };

  const submitComment = async (event, parentId = null) => {
    event.preventDefault();
    const displayName = (name || '').trim().slice(0, 40);
    const message = (parentId ? replyBody : body).trim().slice(0, 500);
    if (!displayName || !message || busy) return;
    setBusy(true);
    try {
      const { error } = await supabaseClient.from('apokolips_blog_comments').insert({
        post_slug: post.slug, visitor_id: visitorId, display_name: displayName,
        body: message, ...(parentId ? { parent_comment_id: parentId } : {})
      });
      if (error) throw error;
      saveDeviceName(displayName);
      if (parentId) { setReplyBody(''); setReplyingTo(null); }
      else setBody('');
      await loadComments();
      setStatus(parentId ? 'Your reply has been shared.' : 'Your comment is now visible to other visitors.');
    } catch (error) { console.error(error); setStatus('Could not post. Please check your connection and try again.'); }
    finally { setBusy(false); }
  };

  const share = async () => {
    const url = window.location.origin + window.location.pathname + '#' + post.id;
    try {
      if (navigator.share) await navigator.share({ title: post.title + ' | Apokolips', text: 'Check out this travel memory on Apokolips.', url });
      else { await navigator.clipboard.writeText(url); setStatus('Link copied. Share it with your friends.'); }
    } catch (error) { if (error?.name !== 'AbortError') setStatus('Sharing is not available in this browser.'); }
  };

  const renderComment = (comment, isReply = false) => h('article', { className: 'comment-item' + (isReply ? ' comment-reply' : ''), key: comment.id },
    h('strong', null, comment.display_name),
    h('p', null, comment.body),
    h('small', null, formatDate(comment.created_at)),
    !isReply ? h('button', { className: 'comment-reply-button', type: 'button', onClick: () => { setReplyingTo(replyingTo === comment.id ? null : comment.id); setReplyBody(''); } }, '↳ Reply') : null,
    !isReply && replyingTo === comment.id ? h('form', { className: 'reply-form', onSubmit: event => submitComment(event, comment.id) },
      h('textarea', { value: replyBody, maxLength: 500, onChange: e => setReplyBody(e.target.value), placeholder: 'Write a reply…', required: true }),
      h('button', { type: 'submit', disabled: busy }, busy ? 'Posting…' : 'Post reply')
    ) : null,
    !isReply && comment.replies.length ? h('div', { className: 'comment-replies' }, comment.replies.map(reply => renderComment(reply, true))) : null
  );

  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const commentTotal = comments.reduce((sum, item) => sum + 1 + item.replies.length, 0);
  return h('div', { className: 'social-card' },
    h('div', { className: 'post-actions', 'aria-label': 'React to this memory' },
      REACTIONS.map(item => h('button', { key: item.type, className: 'reaction-button' + (selected === item.type ? ' selected' : ''), type: 'button', disabled: busy, 'aria-pressed': selected === item.type, onClick: () => reactToPost(item.type) },
        item.label, ' ', h('span', { className: 'reaction-number' }, counts[item.type])
      )),
      h('span', { className: 'reaction-count' }, total + (total === 1 ? ' reaction' : ' reactions')),
      h('button', { className: 'share-media-button', type: 'button', onClick: share }, '↗ Share')
    ),
    h('section', { className: 'comments' },
      h('button', { className: 'comments-toggle', type: 'button', 'aria-expanded': expanded, onClick: () => setExpanded(v => !v) },
        h('span', null, 'Comments & replies'),
        h('span', { className: 'comment-toggle-count' }, commentTotal + (commentTotal === 1 ? ' comment' : ' comments') + (expanded ? ' ▴' : ' ▾'))
      ),
      expanded ? h('div', { className: 'comments-panel' },
        h('form', { className: 'comment-form', onSubmit: event => submitComment(event) },
          h('input', { value: name, onChange: e => setName(e.target.value.slice(0, 40)), maxLength: 40, placeholder: 'Your name', required: true, readOnly: Boolean(getSavedName()), title: getSavedName() ? 'This name is locked on this device' : undefined }),
          h('textarea', { value: body, onChange: e => setBody(e.target.value), maxLength: 500, placeholder: 'Write a comment…', required: true }),
          h('button', { type: 'submit', disabled: busy }, busy ? 'Posting…' : 'Post comment')
        ),
        h('p', { className: 'device-name-hint' }, 'Your first comment locks this name on this browser/device.'),
        h('div', { className: 'comment-list', 'aria-live': 'polite' }, comments.map(comment => renderComment(comment))),
        !comments.length ? h('p', { className: 'interaction-note' }, 'Be the first to leave a comment.') : null
      ) : null
    ),
    h('p', { className: 'interaction-note', role: 'status', 'aria-live': 'polite' }, status)
  );
}

function decodeVapidKey(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function NotificationCenter() {
  const [status, setStatus] = useState('Get alerts for replies and new photos.');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const unread = items.filter(item => !item.read_at).length;

  const load = async () => {
    const { data, error } = await supabaseClient.from('apokolips_blog_notifications')
      .select('id,title,body,target_url,created_at,read_at')
      .eq('recipient_visitor_id', visitorId).order('created_at', { ascending: false }).limit(30);
    if (error) { console.warn('Could not load notifications:', error); return; }
    setItems(data || []);
  };
  useEffect(() => {
    load();
    const swUrl = new URL('../../blog-sw.js', import.meta.url);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register(swUrl).catch(error => console.warn('Blog service worker registration failed:', error));
    const channel = supabaseClient.channel('apokolips-blog-notifications-' + visitorId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'apokolips_blog_notifications', filter: 'recipient_visitor_id=eq.' + visitorId }, load)
      .subscribe();
    (async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const registration = await navigator.serviceWorker.getRegistration(swUrl.pathname);
        const subscription = await registration?.pushManager?.getSubscription();
        if (!subscription) return;
        const { data } = await supabaseClient.from('apokolips_blog_push_subscriptions')
          .select('id').eq('visitor_id', visitorId).eq('endpoint', subscription.endpoint).maybeSingle();
        if (data) { setEnabled(true); setStatus('Notifications are enabled on this browser.'); }
      } catch (error) { console.warn(error); }
    })();
    return () => { supabaseClient.removeChannel(channel); };
  }, []);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('This browser does not support web push notifications.');
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const configResponse = await fetch(SUPABASE_URL + '/functions/v1/apokolips-blog-push', { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } });
      const config = await configResponse.json();
      if (!configResponse.ok || !config.publicKey) throw new Error(config.error || 'Push service is not configured yet.');
      const swUrl = new URL('../../blog-sw.js', import.meta.url);
      const registration = await navigator.serviceWorker.register(swUrl);
      const ready = await navigator.serviceWorker.ready;
      let subscription = await (ready.pushManager || registration.pushManager).getSubscription();
      if (!subscription) subscription = await (ready.pushManager || registration.pushManager).subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapidKey(config.publicKey) });
      const keys = subscription.toJSON().keys || {};
      const { error } = await supabaseClient.from('apokolips_blog_push_subscriptions').upsert({
        visitor_id: visitorId, endpoint: subscription.endpoint, p256dh: keys.p256dh,
        auth: keys.auth, user_agent: navigator.userAgent
      }, { onConflict: 'endpoint' });
      if (error) throw error;
      setEnabled(true); setStatus('Notifications are enabled on this browser.');
    } catch (error) { console.error('Blog push setup failed:', error); setStatus(error.message || 'Could not enable notifications.'); }
    finally { setBusy(false); }
  };

  const openNotification = async item => {
    if (!item.read_at) {
      await supabaseClient.from('apokolips_blog_notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id);
    }
    window.location.href = item.target_url || './blog.html#memories';
  };

  return h('div', { className: 'blog-notification-area' },
    !enabled ? h('button', { type: 'button', disabled: busy, onClick: enable }, busy ? 'Setting up…' : 'Enable notifications') : null,
    h('button', { type: 'button', 'aria-expanded': open, onClick: () => { setOpen(v => !v); if (!open) load(); } }, 'Notifications ', h('span', { className: 'notification-badge' }, unread)),
    h('span', { className: 'notification-status', role: 'status', 'aria-live': 'polite' }, status),
    open ? h('div', { className: 'blog-notification-panel' },
      items.length ? items.map(item => h('button', { className: 'blog-notification-item', type: 'button', key: item.id, onClick: () => openNotification(item) },
        h('strong', null, item.title), h('span', null, item.body),
        h('small', null, formatDate(item.created_at) + (item.read_at ? '' : ' · New'))
      )) : h('p', { className: 'interaction-note' }, 'No notifications yet.')
    ) : null
  );
}

function PostCard({ post, index, onOpen, hidden }) {
  const tilt = event => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width, y = (event.clientY - rect.top) / rect.height;
    event.currentTarget.style.setProperty('--card-x', (x * 100) + '%');
    event.currentTarget.style.setProperty('--card-y', (y * 100) + '%');
    event.currentTarget.style.setProperty('--card-rotate-x', ((.5 - y) * 3.5) + 'deg');
    event.currentTarget.style.setProperty('--card-rotate-y', ((x - .5) * 3.5) + 'deg');
  };
  const reset = event => {
    event.currentTarget.style.setProperty('--card-rotate-x', '0deg');
    event.currentTarget.style.setProperty('--card-rotate-y', '0deg');
  };
  return h('article', { className: 'photo-post blog-post reveal-card', id: post.id, 'data-post-slug': post.slug, style: { display: hidden ? 'none' : undefined, '--card-delay': (index % 6 * 75) + 'ms' }, onPointerMove: tilt, onPointerLeave: reset },
    h('button', { className: 'post-image-button', type: 'button', onClick: () => onOpen(post), 'aria-label': 'Open ' + post.title },
      h('img', { src: post.src, alt: post.alt, loading: 'lazy', decoding: 'async' }),
      h('span', { className: 'image-open-hint' }, 'VIEW MEMORY ↗'),
      h('span', { className: 'image-index' }, String(index + 1).padStart(2, '0'))
    ),
    h('div', { className: 'post-content' },
      h('h3', { className: 'post-title' }, post.title),
      h('div', { className: 'post-date' }, post.dateLabel + ' · Personal photo'),
      h('p', { className: 'post-description' }, post.description),
      h(SocialCard, { post })
    )
  );
}

function Lightbox({ post, onClose, onMove }) {
  useEffect(() => {
    if (!post) return undefined;
    const onKey = event => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowRight') onMove(1); if (event.key === 'ArrowLeft') onMove(-1); };
    window.addEventListener('keydown', onKey); document.body.classList.add('lightbox-open');
    return () => { window.removeEventListener('keydown', onKey); document.body.classList.remove('lightbox-open'); };
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
    return [...POSTS].filter(post => (filter === 'all' || post.type === filter) &&
      (!query || [post.title, post.description, post.dateLabel].join(' ').toLowerCase().includes(query)))
      .sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  }, [search, filter, sort]);

  useEffect(() => {
    let alive = true;
    const loadStats = async () => {
      const [reactions, comments] = await Promise.all([
        supabaseClient.from('apokolips_blog_reactions').select('id', { count: 'exact', head: true }),
        supabaseClient.from('apokolips_blog_comments').select('id', { count: 'exact', head: true })
      ]);
      if (!alive) return;
      setStats({ reactions: reactions.error ? '—' : Number(reactions.count || 0).toLocaleString(), comments: comments.error ? '—' : Number(comments.count || 0).toLocaleString() });
    };
    loadStats();
    const channel = supabaseClient.channel('apokolips-blog-react-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apokolips_blog_reactions' }, loadStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apokolips_blog_comments' }, loadStats)
      .subscribe();
    return () => { alive = false; supabaseClient.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, window.scrollY / max * 100) : 0);
      setShowTop(window.scrollY > 420);
    };
    const onKey = event => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { event.preventDefault(); searchRef.current?.focus(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('keydown', onKey); update();
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal-card, .blog-reveal');
    if (!('IntersectionObserver' in window)) { nodes.forEach(node => node.classList.add('is-visible')); return undefined; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
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
    try { await navigator.clipboard.writeText(url); }
    catch (_) { window.prompt('Copy this blog link:', url); }
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
        h(NotificationCenter)
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
              h('option', { value: 'all' }, 'All media'), h('option', { value: 'photo' }, 'Photos'), h('option', { value: 'video' }, 'Videos')
            ),
            h('select', { value: sort, onChange: e => setSort(e.target.value), 'aria-label': 'Sort memories' },
              h('option', { value: 'newest' }, 'Newest first'), h('option', { value: 'oldest' }, 'Oldest first')
            ),
            h('button', { className: 'layout-toggle', type: 'button', onClick: () => setLayout(v => v === 'grid' ? 'list' : 'grid'), 'aria-label': layout === 'grid' ? 'Switch to list view' : 'Switch to grid view' }, layout === 'grid' ? '☷' : '▦')
          )
        ),
        h('div', { className: 'media-grid ' + (layout === 'list' ? 'media-grid-list' : ''), id: 'mediaGrid' },
          currentPosts.map((post, index) => h(PostCard, { key: post.id, post, index, onOpen: openPost }))
        ),
        currentPosts.length === 0 ? h('div', { className: 'empty-state blog-empty' }, h('div', { className: 'empty-icon' }, '✧'), h('h3', null, 'No matching memories'), h('p', null, 'Try another search or select a different media filter.')) : null,
        h('div', { className: 'blog-end-note' }, h('span', null, '✦'), ' More journeys. More stories. More to come.')
      )
    ),
    h('footer', { className: 'footer blog-footer' }, h('span', null, '© ' + new Date().getFullYear() + ' Lakindu Sathsara'), h('span', null, h('a', { href: 'index.html' }, 'BACK TO HOME ↑'))),
    h('button', { className: 'back-to-top blog-back-top' + (showTop ? ' visible' : ''), type: 'button', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), 'aria-label': 'Back to top' }, '↑'),
    h(Lightbox, { post: lightboxPost, onClose: () => setLightboxPost(null), onMove: moveLightbox })
  );
}

export default App;
