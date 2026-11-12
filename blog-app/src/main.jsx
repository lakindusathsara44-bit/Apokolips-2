import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { blogVisitorId, supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase';
import './styles.css';
import '../../style.css';

const TABLES = {
  reactions: 'apokolips_blog_reactions',
  comments: 'apokolips_blog_comments',
  notifications: 'apokolips_blog_notifications',
  subscriptions: 'apokolips_blog_push_subscriptions'
};

const REACTIONS = [
  { type: 'like', label: 'Like', emoji: '👍' },
  { type: 'love', label: 'Love', emoji: '❤️' },
  { type: 'wow', label: 'Wow', emoji: '😍' },
  { type: 'fire', label: 'Fire', emoji: '🔥' }
];

const POSTS = [
  {
    id: 'travel-photo-20261016',
    slug: 'travel-memory-2026-10-16',
    image: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0139.jpg',
    alt: 'Travel memory shared by Lakindu Sathsara',
    title: 'A moment worth remembering',
    date: '2026-10-16',
    dateLabel: '16 October 2026',
    description: 'One of my captured moments. More travel memories will be added here.',
    kind: 'Photo'
  },
  {
    id: 'travel-photo-20261016-wa0120',
    slug: 'travel-photo-20261016-wa0120',
    image: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/IMG-20261016-WA0120%281%29.jpg',
    alt: 'Additional travel photograph shared by Lakindu Sathsara',
    title: 'Another moment to remember',
    date: '2026-10-16',
    dateLabel: '16 October 2026',
    description: 'Another captured moment from the journey.',
    kind: 'Photo'
  },
  {
    id: 'travel-photo-20261110-wa0021',
    slug: 'travel-photo-2026-11-10-wa0021',
    image: 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips-2/main/IMG-20261110-WA0021.jpg',
    alt: 'Travel photograph shared by Lakindu Sathsara on 10 November 2026',
    title: 'A new moment to remember',
    date: '2026-11-10',
    dateLabel: '10 November 2026',
    description: 'Another captured moment, added to the Apokolips travel memories.',
    kind: 'Photo'
  }
];

const DEVICE_NAME_KEY = 'apokolips-blog-device-name-v1';
const PUSH_FUNCTION_URL = SUPABASE_URL + '/functions/v1/apokolips-blog-push';
const ICON_URL = 'https://raw.githubusercontent.com/lakindusathsara44-bit/Apokolips/main/file_00000000a7ec820890154ca6ed49b608.png';

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function decodeVapidKey(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [introExiting, setIntroExiting] = useState(false);
  const [introProgress, setIntroProgress] = useState(12);
  const [activity, setActivity] = useState({});
  const [deviceName, setDeviceName] = useState(() => localStorage.getItem(DEVICE_NAME_KEY) || '');
  const [nameDraft, setNameDraft] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyOpen, setReplyOpen] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState('Get alerts for replies and new travel photos.');
  const [pushBusy, setPushBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return POSTS.filter((post) => {
      const matchesQuery = !query || [post.title, post.description, post.dateLabel, post.kind].join(' ').toLowerCase().includes(query);
      const matchesFilter = filter === 'All' || post.kind === filter;
      return matchesQuery && matchesFilter;
    }).sort((a, b) => sort === 'newest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  }, [search, filter, sort]);

  const notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  }, []);

  const lockName = useCallback((value) => {
    const clean = value.trim().slice(0, 40);
    if (!clean) return '';
    localStorage.setItem(DEVICE_NAME_KEY, clean);
    setDeviceName(clean);
    setNameDraft(clean);
    return clean;
  }, []);

  const refreshPost = useCallback(async (slug) => {
    const [reactionResult, commentResult] = await Promise.all([
      supabase.from(TABLES.reactions).select('reaction,visitor_id').eq('post_slug', slug),
      supabase.from(TABLES.comments).select('id,parent_comment_id,display_name,body,created_at,visitor_id').eq('post_slug', slug).order('created_at', { ascending: true }).limit(200)
    ]);
    if (reactionResult.error) throw reactionResult.error;
    if (commentResult.error) throw commentResult.error;
    const counts = Object.fromEntries(REACTIONS.map((item) => [item.type, 0]));
    let selected = null;
    (reactionResult.data || []).forEach((row) => {
      if (counts[row.reaction] !== undefined) counts[row.reaction] += 1;
      if (row.visitor_id === blogVisitorId) selected = row.reaction;
    });
    setActivity((current) => ({
      ...current,
      [slug]: {
        counts,
        selected,
        comments: commentResult.data || []
      }
    }));
  }, []);

  const refreshNotifications = useCallback(async () => {
    const { data, error } = await supabase.from(TABLES.notifications)
      .select('id,title,body,target_url,created_at,read_at')
      .eq('recipient_visitor_id', blogVisitorId)
      .order('created_at', { ascending: false }).limit(30);
    if (error) {
      console.warn('Could not load blog notifications:', error);
      return;
    }
    setNotifications(data || []);
  }, []);

  useEffect(() => {
    const startedAt = performance.now();
    let finished = false;
    let hideTimer;
    let exitTimer;
    const finish = () => {
      if (finished) return;
      finished = true;
      setIntroProgress(100);
      hideTimer = window.setTimeout(() => {
        setIntroExiting(true);
        exitTimer = window.setTimeout(() => setShowIntro(false), 520);
      }, Math.max(0, 7500 - (performance.now() - startedAt)));
    };
    const updateReadyState = () => {
      if (document.readyState === 'interactive') {
        setIntroProgress((value) => Math.max(value, 58));
      }
      if (document.readyState === 'complete') finish();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShowIntro(false);
    } else {
      document.addEventListener('readystatechange', updateReadyState);
      window.addEventListener('load', finish, { once: true });
      updateReadyState();
    }
    return () => {
      document.removeEventListener('readystatechange', updateReadyState);
      window.removeEventListener('load', finish);
      window.clearTimeout(hideTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  useEffect(() => {
    POSTS.forEach((post) => refreshPost(post.slug).catch((error) => {
      console.error('Blog activity load failed:', error);
      notify('Some shared activity could not be loaded. Please refresh the page.');
    }));
    refreshNotifications();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./blog-sw.js').catch((error) => console.warn('Blog service worker registration failed:', error));
    }

    const channel = supabase.channel('apokolips-blog-react-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.reactions }, (payload) => {
        const slug = payload.new?.post_slug || payload.old?.post_slug;
        if (slug && POSTS.some((post) => post.slug === slug)) refreshPost(slug).catch(console.error);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLES.comments }, (payload) => {
        const slug = payload.new?.post_slug || payload.old?.post_slug;
        if (slug && POSTS.some((post) => post.slug === slug)) refreshPost(slug).catch(console.error);
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: TABLES.notifications,
        filter: 'recipient_visitor_id=eq.' + blogVisitorId
      }, refreshNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshPost, refreshNotifications, notify]);

  useEffect(() => {
    if (deviceName) return;
    let cancelled = false;
    supabase.from(TABLES.comments).select('display_name')
      .eq('visitor_id', blogVisitorId).order('created_at', { ascending: true }).limit(1)
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.[0]?.display_name) lockName(data[0].display_name);
      });
    return () => { cancelled = true; };
  }, [deviceName, lockName]);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? Math.min(100, Math.max(0, window.scrollY / max * 100)) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const nodes = document.querySelectorAll('.blog-reveal');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((node) => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visiblePosts.length]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightbox(null);
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        const index = POSTS.findIndex((post) => post.id === lightbox.id);
        const next = event.key === 'ArrowRight' ? (index + 1) % POSTS.length : (index - 1 + POSTS.length) % POSTS.length;
        setLightbox(POSTS[next]);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox]);

  async function saveReaction(post, type) {
    const state = activity[post.slug];
    if (state?.selected === type) return;
    try {
      const { data: updated, error: updateError } = await supabase.from(TABLES.reactions)
        .update({ reaction: type }).eq('post_slug', post.slug).eq('visitor_id', blogVisitorId).select('id');
      if (updateError) throw updateError;
      if (!updated?.length) {
        const { error: insertError } = await supabase.from(TABLES.reactions)
          .insert({ post_slug: post.slug, visitor_id: blogVisitorId, reaction: type });
        if (insertError && insertError.code === '23505') {
          const { error: retryError } = await supabase.from(TABLES.reactions)
            .update({ reaction: type }).eq('post_slug', post.slug).eq('visitor_id', blogVisitorId);
          if (retryError) throw retryError;
        } else if (insertError) throw insertError;
      }
      await refreshPost(post.slug);
      notify('Your ' + type + ' reaction has been shared.');
    } catch (error) {
      console.error('Reaction save failed:', error);
      notify('Your reaction could not be saved. Please try again.');
    }
  }

  async function submitComment(event, post) {
    event.preventDefault();
    const formName = deviceName || nameDraft.trim().slice(0, 40);
    const body = (commentDrafts[post.slug] || '').trim().slice(0, 500);
    if (!formName || !body) {
      notify('Enter your name and a comment first.');
      return;
    }
    try {
      const { error } = await supabase.from(TABLES.comments).insert({
        post_slug: post.slug,
        visitor_id: blogVisitorId,
        display_name: formName,
        body
      });
      if (error) throw error;
      if (!deviceName) lockName(formName);
      setCommentDrafts((current) => ({ ...current, [post.slug]: '' }));
      await refreshPost(post.slug);
      notify('Your comment has been posted.');
    } catch (error) {
      console.error('Comment post failed:', error);
      notify('The comment could not be posted. Please try again.');
    }
  }

  async function submitReply(event, post, parentId) {
    event.preventDefault();
    const formName = deviceName || nameDraft.trim().slice(0, 40);
    const body = (replyDrafts[parentId] || '').trim().slice(0, 500);
    if (!formName || !body) {
      notify('Enter your name and a reply first.');
      return;
    }
    try {
      const { error } = await supabase.from(TABLES.comments).insert({
        post_slug: post.slug,
        visitor_id: blogVisitorId,
        display_name: formName,
        body,
        parent_comment_id: parentId
      });
      if (error) throw error;
      if (!deviceName) lockName(formName);
      setReplyDrafts((current) => ({ ...current, [parentId]: '' }));
      setReplyOpen((current) => ({ ...current, [parentId]: false }));
      await refreshPost(post.slug);
      notify('Your reply has been posted.');
    } catch (error) {
      console.error('Reply post failed:', error);
      notify('The reply could not be posted. Please try again.');
    }
  }

  async function sharePost(post) {
    const url = window.location.origin + window.location.pathname + '#' + post.id;
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, text: 'A travel memory from Apokolips', url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        notify('Post link copied.');
      } else {
        window.prompt('Copy this link:', url);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Could not share this post.');
    }
  }

  async function loadPushConfig() {
    const response = await fetch(PUSH_FUNCTION_URL, {
      method: 'GET',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY }
    });
    const data = await response.json();
    if (!response.ok || !data.publicKey) throw new Error(data.error || 'Push notifications are not configured.');
    return data.publicKey;
  }

  async function enablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('This browser does not support web push notifications.');
      return;
    }
    setPushBusy(true);
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') throw new Error('Notification permission was not granted.');
      const publicKey = await loadPushConfig();
      const registration = await navigator.serviceWorker.register('./blog-sw.js');
      const ready = await navigator.serviceWorker.ready;
      let subscription = await (ready.pushManager || registration.pushManager).getSubscription();
      if (!subscription) {
        subscription = await (ready.pushManager || registration.pushManager).subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(publicKey)
        });
      }
      const details = subscription.toJSON();
      const { error } = await supabase.from(TABLES.subscriptions).upsert({
        visitor_id: blogVisitorId,
        endpoint: subscription.endpoint,
        p256dh: details.keys?.p256dh,
        auth: details.keys?.auth,
        user_agent: navigator.userAgent
      }, { onConflict: 'endpoint' });
      if (error) throw error;
      setPushStatus('Notifications are enabled on this browser.');
      notify('Blog notifications enabled.');
    } catch (error) {
      console.error('Push setup failed:', error);
      setPushStatus(error.message || 'Could not enable notifications.');
    } finally {
      setPushBusy(false);
    }
  }

  async function openNotification(item) {
    if (!item.read_at) {
      const { error } = await supabase.from(TABLES.notifications)
        .update({ read_at: new Date().toISOString() }).eq('id', item.id);
      if (error) console.warn('Could not mark notification as read:', error);
    }
    setNotificationOpen(false);
    const target = item.target_url || './blog.html#memories';
    window.location.href = target;
  }

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.read_at);
    if (!unread.length) return;
    const { error } = await supabase.from(TABLES.notifications)
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_visitor_id', blogVisitorId).is('read_at', null);
    if (error) {
      notify('Could not mark notifications as read.');
      return;
    }
    await refreshNotifications();
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <>
      {showIntro && <div className={'mechanical-intro' + (introExiting ? ' is-exiting' : '')} role="status" aria-label="Apokolips blog is loading">
        <div className="intro-grid" /><div className="intro-corner intro-corner-tl" /><div className="intro-corner intro-corner-br" />
        <div className="intro-machine">
          <div className="intro-orbit intro-orbit-one" /><div className="intro-orbit intro-orbit-two" />
          <div className="intro-gear intro-gear-large"><span /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="intro-gear intro-gear-small"><span /><i /><i /><i /><i /><i /></div>
          <div className="intro-arm intro-arm-top"><i /><b /></div><div className="intro-arm intro-arm-right"><i /><b /></div>
          <div className="intro-arm intro-arm-bottom"><i /><b /></div><div className="intro-arm intro-arm-left"><i /><b /></div>
          <div className="intro-core"><img src={ICON_URL} alt="Apokolips icon" /><span /></div>
          <div className="intro-scanline" />
        </div>
        <div className="intro-brand">APOKOLIPS</div><div className="intro-subtitle">BLOG SYSTEMS · ONLINE</div>
        <div className="intro-progress"><span style={{ width: introProgress + '%' }} /></div>
        <div className="intro-status"><span>{introProgress === 100 ? 'SYSTEM READY' : 'LOADING RESOURCES'}</span><strong>{introProgress}%</strong></div>
      </div>}

      <div className="blog-progress-track"><span style={{ width: scrollProgress + '%' }} /></div>
      <div className="blog2-shell">
        <header className="blog2-nav">
          <a className="blog2-brand" href="./index.html">
            <img src={ICON_URL} alt="" />
            <span>APOKOLIPS</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="./index.html">Home</a>
            <a href="./info.html">About</a>
            <a href="./project.gallery.html">Gallery</a>
            <a href="./My-project.html">Projects</a>
          </nav>
          <div className="blog2-nav-actions">
            <button className="blog2-bell" type="button" onClick={() => setNotificationOpen((open) => !open)} aria-expanded={notificationOpen} aria-label="Open notifications">
              <span>♧</span>{unreadCount > 0 && <i>{unreadCount > 9 ? '9+' : unreadCount}</i>}
            </button>
            <a className="blog2-back" href="./info.html">← Back</a>
          </div>
          {notificationOpen && <div className="blog2-notifications">
            <div className="blog2-notification-head"><strong>Notifications</strong><button type="button" onClick={markAllRead}>Mark all read</button></div>
            {notifications.length === 0 ? <p>No notifications yet.</p> : notifications.map((item) => (
              <button className={'blog2-notification' + (!item.read_at ? ' unread' : '')} key={item.id} type="button" onClick={() => openNotification(item)}>
                <strong>{item.title}</strong><span>{item.body}</span><small>{formatDate(item.created_at)}</small>
              </button>
            ))}
          </div>}
        </header>

        <main>
          <section className="blog2-hero">
            <div className="blog2-hero-orb blog2-orb-one" /><div className="blog2-hero-orb blog2-orb-two" />
            <div className="blog2-kicker"><span /> PERSONAL TRAVEL JOURNAL / 01</div>
            <h1>Places I've <span>explored.</span></h1>
            <p>A collection of travel moments, photographs, and videos. Every journey has a story — this is where I keep mine.</p>
            <div className="blog2-hero-bottom">
              <a href="#memories">Explore memories <span>↓</span></a>
              <span className="blog2-live"><i /> LIVE COMMUNITY</span>
            </div>
            <div className="blog2-hero-lines" />
          </section>

          <section className="blog2-notification-strip blog-reveal">
            <div><strong>Stay connected</strong><span>{pushStatus}</span></div>
            <button type="button" onClick={enablePush} disabled={pushBusy}>{pushBusy ? 'Setting up…' : 'Enable notifications'} <span>↗</span></button>
          </section>

          <section className="blog2-memory-section" id="memories">
            <div className="blog2-section-heading blog-reveal">
              <div><span className="blog2-eyebrow">THE JOURNAL</span><h2>Photo & video memories<span>.</span></h2></div>
              <span className="blog2-post-total">{String(POSTS.length).padStart(2, '0')} STORIES</span>
            </div>

            <div className="blog2-tools blog-reveal">
              <label className="blog2-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search memories..." aria-label="Search memories" /><kbd>⌘ K</kbd></label>
              <div className="blog2-tool-right">
                <div className="blog2-filters" role="group" aria-label="Filter memories">
                  {['All', 'Photo', 'Video'].map((item) => <button type="button" key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'All' ? 'All' : item + 's'}</button>)}
                </div>
                <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort memories">
                  <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>

            <div className="blog2-post-grid">
              {visiblePosts.map((post, index) => {
                const state = activity[post.slug] || { counts: {}, selected: null, comments: [] };
                const comments = state.comments || [];
                const roots = comments.filter((comment) => !comment.parent_comment_id);
                const replies = comments.filter((comment) => comment.parent_comment_id);
                const totalReactions = Object.values(state.counts || {}).reduce((sum, count) => sum + count, 0);
                const expanded = !!commentsOpen[post.slug];
                return <article className="blog2-post blog-reveal" id={post.id} key={post.id} style={{ '--card-index': index }}>
                  <button className="blog2-image-button" type="button" onClick={() => setLightbox(post)} aria-label={'Open ' + post.title}>
                    <img src={post.image} alt={post.alt} loading="lazy" />
                    <span className="blog2-image-type">{post.kind} <i>↗</i></span>
                    <span className="blog2-image-zoom">＋</span>
                  </button>
                  <div className="blog2-post-body">
                    <div className="blog2-post-meta"><span>{post.dateLabel}</span><i /> <span>PERSONAL MEMORY</span></div>
                    <h3>{post.title}</h3>
                    <p className="blog2-description">{post.description}</p>
                    <div className="blog2-reactions">
                      {REACTIONS.map((reaction) => <button type="button" key={reaction.type} className={(state.selected === reaction.type ? 'selected ' : '') + 'reaction-' + reaction.type} aria-pressed={state.selected === reaction.type} onClick={() => saveReaction(post, reaction.type)}>
                        <span>{reaction.emoji}</span><b>{reaction.label}</b><small>{state.counts?.[reaction.type] || 0}</small>
                      </button>)}
                    </div>
                    <div className="blog2-post-footer">
                      <button type="button" className="blog2-comment-toggle" onClick={() => setCommentsOpen((current) => ({ ...current, [post.slug]: !current[post.slug] }))}>
                        <span>▤</span> {comments.length} comments <i>{expanded ? '−' : '+'}</i>
                      </button>
                      <button type="button" className="blog2-share" onClick={() => sharePost(post)}>Share <span>↗</span></button>
                      <span className="blog2-reaction-total">{totalReactions} reactions</span>
                    </div>

                    {expanded && <section className="blog2-comments">
                      <div className="blog2-comments-title"><strong>Conversation</strong><span>{comments.length} total · live updates</span></div>
                      <form className="blog2-comment-form" onSubmit={(event) => submitComment(event, post)}>
                        {!deviceName && <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={40} placeholder="Your name" aria-label="Your name" required />}
                        {deviceName && <div className="blog2-locked-name"><span>COMMENTING AS</span><strong>{deviceName}</strong><small>Device name locked</small></div>}
                        <textarea value={commentDrafts[post.slug] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.slug]: event.target.value }))} maxLength={500} placeholder="Write a comment..." aria-label="Write a comment" required />
                        <button type="submit">Post comment <span>↗</span></button>
                      </form>
                      <div className="blog2-comment-list">
                        {roots.length === 0 ? <p className="blog2-empty-comments">No comments yet. Start the conversation.</p> : roots.map((comment) => {
                          const childReplies = replies.filter((reply) => reply.parent_comment_id === comment.id);
                          return <article className="blog2-comment" key={comment.id}>
                            <div className="blog2-avatar">{(comment.display_name || '?').slice(0, 1).toUpperCase()}</div>
                            <div className="blog2-comment-content">
                              <div className="blog2-comment-by"><strong>{comment.display_name}</strong><time>{formatDate(comment.created_at)}</time></div>
                              <p>{comment.body}</p>
                              <button className="blog2-reply-trigger" type="button" onClick={() => setReplyOpen((current) => ({ ...current, [comment.id]: !current[comment.id] }))}>↳ Reply</button>
                              {replyOpen[comment.id] && <form className="blog2-reply-form" onSubmit={(event) => submitReply(event, post, comment.id)}>
                                {!deviceName && <input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={40} placeholder="Your name" required />}
                                <textarea value={replyDrafts[comment.id] || ''} onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment.id]: event.target.value }))} maxLength={500} placeholder={'Reply to ' + comment.display_name + '...'} required />
                                <button type="submit">Send reply ↗</button>
                              </form>}
                              {childReplies.length > 0 && <div className="blog2-replies">{childReplies.map((reply) => <div className="blog2-reply" key={reply.id}>
                                <div className="blog2-avatar small">{(reply.display_name || '?').slice(0, 1).toUpperCase()}</div>
                                <div><div className="blog2-comment-by"><strong>{reply.display_name}</strong><time>{formatDate(reply.created_at)}</time></div><p>{reply.body}</p></div>
                              </div>)}</div>}
                            </div>
                          </article>;
                        })}
                      </div>
                    </section>}
                  </div>
                </article>;
              })}
            </div>
            {visiblePosts.length === 0 && <div className="blog2-no-results"><span>⌕</span><h3>No memories found</h3><p>Try another search term or clear the active filter.</p><button type="button" onClick={() => { setSearch(''); setFilter('All'); }}>Clear filters</button></div>}
          </section>
        </main>

        <footer className="blog2-footer">
          <a className="blog2-brand" href="./index.html"><img src={ICON_URL} alt="" /><span>APOKOLIPS</span></a>
          <span>Ideas become something real.</span>
          <a href="#memories">Back to top ↑</a>
        </footer>
      </div>

      {lightbox && <div className="blog2-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setLightbox(null)}>
        <button type="button" className="blog2-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close photo viewer">×</button>
        <button type="button" className="blog2-lightbox-prev" onClick={(event) => { event.stopPropagation(); const index = POSTS.findIndex((post) => post.id === lightbox.id); setLightbox(POSTS[(index - 1 + POSTS.length) % POSTS.length]); }} aria-label="Previous photo">‹</button>
        <img src={lightbox.image} alt={lightbox.alt} onClick={(event) => event.stopPropagation()} />
        <button type="button" className="blog2-lightbox-next" onClick={(event) => { event.stopPropagation(); const index = POSTS.findIndex((post) => post.id === lightbox.id); setLightbox(POSTS[(index + 1) % POSTS.length]); }} aria-label="Next photo">›</button>
        <div className="blog2-lightbox-caption">{lightbox.title} <span>{lightbox.dateLabel}</span></div>
      </div>}
      {toast && <div className="blog2-toast" role="status">{toast}</div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
