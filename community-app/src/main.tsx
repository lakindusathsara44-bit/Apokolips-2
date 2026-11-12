import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import './styles.css';

type Space = { id: string; slug: string; name: string; description: string };
type Profile = { username: string; display_name: string; avatar_url?: string | null };
type Vote = { user_id: string; value: number };
type Post = {
  id: string;
  space_id: string;
  author_id: string;
  title: string;
  body: string;
  link_url: string | null;
  created_at: string;
  space: Space | Space[] | null;
  author: Profile | Profile[] | null;
  votes: Vote[] | null;
  comment_count: { count: number }[] | null;
};
type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author: Profile | Profile[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || 'A';
}

function timeAgo(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return new Date(value).toLocaleDateString();
}

function scoreOf(post: Post): number {
  return (post.votes ?? []).reduce((total, vote) => total + Number(vote.value), 0);
}

function usernameFrom(user: User): string {
  const metadataName = String(user.user_metadata?.username ?? '');
  const emailName = (user.email ?? 'member').split('@')[0];
  const cleaned = (metadataName || emailName).toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 20);
  return cleaned.length >= 3 ? cleaned : 'member_' + user.id.slice(0, 6);
}

async function ensureProfile(user: User): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('community_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;

  const displayName = String(user.user_metadata?.display_name ?? '') || (user.email ?? 'Community member').split('@')[0];
  const baseUsername = usernameFrom(user);
  const firstAttempt = await supabase.from('community_profiles').insert({
    id: user.id,
    username: baseUsername,
    display_name: displayName.slice(0, 40)
  });
  if (!firstAttempt.error) return;

  if (firstAttempt.error.code === '23505') {
    const fallbackUsername = (baseUsername.slice(0, 13) + '_' + user.id.slice(0, 6)).slice(0, 20);
    const retry = await supabase.from('community_profiles').insert({
      id: user.id,
      username: fallbackUsername,
      display_name: displayName.slice(0, 40)
    });
    if (!retry.error) return;
    throw retry.error;
  }
  throw firstAttempt.error;
}

function Avatar({ name }: { name: string }) {
  return <span className="avatar" aria-hidden="true">{initials(name)}</span>;
}

function AuthModal({
  onClose,
  onMessage,
  onAuthenticated
}: {
  onClose: () => void;
  onMessage: (message: string) => void;
  onAuthenticated: () => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signup') {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error('Username must be 3–20 characters and use only letters, numbers, or underscores.');
        }
        if (displayName.trim().length < 1 || displayName.trim().length > 40) {
          throw new Error('Please enter a display name (up to 40 characters).');
        }
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin + '/Community.chat.html',
            data: { username: username.toLowerCase(), display_name: displayName.trim() }
          }
        });
        if (authError) throw authError;
        if (data.session) {
          onAuthenticated();
          onMessage('Your account is ready. Welcome to the community.');
          onClose();
        } else {
          onMessage('Account created. Check your email to confirm your address, then sign in.');
          onClose();
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        onAuthenticated();
        onMessage('You are signed in.');
        onClose();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/Community.chat.html'
    });
    setBusy(false);
    if (resetError) setError(resetError.message);
    else onMessage('Password reset instructions have been sent if the email is registered.');
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close">×</button>
      <div className="brand-mark small-mark">A<span>•</span></div>
      <p className="eyebrow">APOKOLIPS COMMUNITY</p>
      <h2 id="auth-title">{mode === 'signin' ? 'Welcome back.' : 'Join the conversation.'}</h2>
      <p className="muted">{mode === 'signin' ? 'Sign in to vote, post, and join discussions.' : 'Create an account to share ideas with the community.'}</p>
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && <>
          <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} autoComplete="name" required /></label>
          <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} autoComplete="username" placeholder="your_name" required /></label>
        </>}
        <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button full-button" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
      </form>
      {mode === 'signin' && <button className="text-button forgot-button" type="button" onClick={resetPassword} disabled={busy}>Forgot password?</button>}
      <div className="auth-switch">
        {mode === 'signin' ? 'New around here?' : 'Already have an account?'}
        <button className="text-button" type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}>
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </div>
      <p className="auth-note">By continuing, you agree to keep discussions respectful and follow the community guidelines.</p>
    </section>
  </div>;
}

function CommentSection({
  post,
  user,
  onNeedAuth
}: {
  post: Post;
  user: User | null;
  onNeedAuth: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadComments = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('community_comments')
      .select('id,post_id,parent_id,body,created_at,author:community_profiles!community_comments_author_id_fkey(username,display_name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .limit(100);
    if (queryError) setError(queryError.message);
    else setComments((data ?? []) as unknown as Comment[]);
    setLoading(false);
  }, [post.id]);

  async function toggleComments() {
    if (!open && comments.length === 0) await loadComments();
    setOpen(!open);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      onNeedAuth();
      return;
    }
    if (!body.trim()) return;
    setSending(true);
    setError('');
    const { error: insertError } = await supabase.from('community_comments').insert({
      post_id: post.id,
      parent_id: replyTo?.id ?? null,
      author_id: user.id,
      body: body.trim()
    });
    if (insertError) setError(insertError.message);
    else {
      setBody('');
      setReplyTo(null);
      await loadComments();
    }
    setSending(false);
  }

  const topLevel = comments.filter((comment) => !comment.parent_id);
  const replies = comments.filter((comment) => comment.parent_id);

  return <div className="comment-area">
    <button className="post-action" type="button" onClick={toggleComments}>
      <span aria-hidden="true">▤</span> {open ? 'Hide discussion' : 'Comments'} <span className="action-count">{post.comment_count?.[0]?.count ?? comments.length}</span>
    </button>
    {open && <div className="comments-panel">
      {loading && <p className="muted small-text">Loading discussion…</p>}
      {!loading && comments.length === 0 && <p className="muted small-text">No comments yet. Start the conversation.</p>}
      {topLevel.map((comment) => {
        const author = one(comment.author);
        return <div className="comment-item" key={comment.id}>
          <div className="comment-avatar-line"><Avatar name={author?.display_name || author?.username || 'Member'} /><span className="comment-stem" /></div>
          <div className="comment-content">
            <div className="comment-meta"><strong>{author?.display_name || author?.username || 'Community member'}</strong><span>@{author?.username || 'member'}</span><time>{timeAgo(comment.created_at)}</time></div>
            <p>{comment.body}</p>
            {user && <button className="text-button reply-button" type="button" onClick={() => setReplyTo(comment)}>Reply</button>}
            {replies.filter((reply) => reply.parent_id === comment.id).map((reply) => {
              const replyAuthor = one(reply.author);
              return <div className="reply-item" key={reply.id}>
                <div className="comment-meta"><strong>{replyAuthor?.display_name || replyAuthor?.username || 'Community member'}</strong><span>@{replyAuthor?.username || 'member'}</span><time>{timeAgo(reply.created_at)}</time></div>
                <p>{reply.body}</p>
              </div>;
            })}
          </div>
        </div>;
      })}
      {error && <p className="form-error">{error}</p>}
      {user ? <form className="comment-form" onSubmit={submitComment}>
        {replyTo && <div className="replying-label">Replying to @{one(replyTo.author)?.username || 'member'} <button type="button" className="text-button" onClick={() => setReplyTo(null)}>Cancel</button></div>}
        <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder={replyTo ? 'Write a reply…' : 'Add to the discussion…'} aria-label="Write a comment" />
        <button className="primary-button" type="submit" disabled={sending || !body.trim()}>{sending ? 'Sending…' : replyTo ? 'Reply' : 'Comment'}</button>
      </form> : <button className="signin-prompt" type="button" onClick={onNeedAuth}>Sign in to join the discussion</button>}
    </div>}
  </div>;
}

function PostCard({
  post,
  user,
  onNeedAuth,
  onVote,
  onDelete
}: {
  post: Post;
  user: User | null;
  onNeedAuth: () => void;
  onVote: (post: Post, value: number) => void;
  onDelete: (post: Post) => void;
}) {
  const author = one(post.author);
  const space = one(post.space);
  const myVote = user ? post.votes?.find((vote) => vote.user_id === user.id)?.value ?? 0 : 0;
  const score = scoreOf(post);
  const displayName = author?.display_name || author?.username || 'Community member';
  let linkHost = '';
  if (post.link_url) {
    try { linkHost = new URL(post.link_url).hostname.replace(/^www\./, ''); } catch { linkHost = 'Open link'; }
  }

  return <article className="post-card">
    <div className="vote-rail" aria-label="Post voting">
      <button className={'vote-button ' + (myVote === 1 ? 'is-upvoted' : '')} type="button" aria-label="Upvote" aria-pressed={myVote === 1} onClick={() => onVote(post, 1)}>▲</button>
      <strong className="vote-score">{score}</strong>
      <button className={'vote-button downvote ' + (myVote === -1 ? 'is-downvoted' : '')} type="button" aria-label="Downvote" aria-pressed={myVote === -1} onClick={() => onVote(post, -1)}>▼</button>
    </div>
    <div className="post-main">
      <div className="post-meta">
        <span className="space-tag">{space?.name || 'Community'}</span>
        <span>Posted by <strong>{displayName}</strong></span>
        <span>@{author?.username || 'member'}</span>
        <time>{timeAgo(post.created_at)}</time>
      </div>
      <h2 className="post-title">{post.title}</h2>
      {post.body && <p className="post-body">{post.body}</p>}
      {post.link_url && <a className="link-preview" href={post.link_url} target="_blank" rel="noopener noreferrer">
        <span className="link-icon">↗</span><span><strong>{linkHost}</strong><small>{post.link_url}</small></span>
      </a>}
      <div className="post-footer">
        <CommentSection post={post} user={user} onNeedAuth={onNeedAuth} />
        <span className="post-footer-spacer" />
        {user?.id === post.author_id && <button className="post-action delete-action" type="button" onClick={() => onDelete(post)} title="Delete your post">Delete</button>}
        {!user && <button className="post-action" type="button" onClick={onNeedAuth}>Sign in to vote</button>}
      </div>
    </div>
  </article>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profileReady, setProfileReady] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [activeSpace, setActiveSpace] = useState('all');
  const [sort, setSort] = useState<'new' | 'top'>('new');
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postLink, setPostLink] = useState('');
  const [postSpace, setPostSpace] = useState('general');
  const [posting, setPosting] = useState(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 4200);
  }, []);

  const loadSpaces = useCallback(async () => {
    const { data, error } = await supabase.from('community_spaces').select('id,slug,name,description').order('name');
    if (error) notify('Could not load communities: ' + error.message);
    else setSpaces((data ?? []) as Space[]);
  }, [notify]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('community_posts')
      .select('id,space_id,author_id,title,body,link_url,created_at,space:community_spaces!community_posts_space_id_fkey(id,slug,name,description),author:community_profiles!community_posts_author_id_fkey(username,display_name,avatar_url),votes:community_votes(value,user_id),comment_count:community_comments(count)')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) notify('Could not load posts: ' + error.message);
    else setPosts((data ?? []) as unknown as Post[]);
    setLoading(false);
  }, [notify]);

  useEffect(() => {
    void loadSpaces();
    void loadFeed();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfileReady(false);
    });
    return () => authListener.subscription.unsubscribe();
  }, [loadSpaces, loadFeed]);

  useEffect(() => {
    if (!user) {
      setProfileReady(false);
      return;
    }
    let active = true;
    ensureProfile(user)
      .then(() => { if (active) setProfileReady(true); })
      .catch((error: unknown) => {
        if (active) notify('Profile setup failed: ' + (error instanceof Error ? error.message : 'Please sign in again.'));
      });
    return () => { active = false; };
  }, [user, notify]);

  useEffect(() => {
    const channel = supabase.channel('community-feed-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => { void loadFeed(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, () => { void loadFeed(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_votes' }, () => { void loadFeed(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadFeed]);

  const visiblePosts = useMemo(() => {
    let result = [...posts];
    if (activeSpace !== 'all') result = result.filter((post) => one(post.space)?.slug === activeSpace);
    const term = search.trim().toLowerCase();
    if (term) result = result.filter((post) => {
      const author = one(post.author);
      return [post.title, post.body, one(post.space)?.name, author?.display_name, author?.username].join(' ').toLowerCase().includes(term);
    });
    if (sort === 'top') result.sort((a, b) => scoreOf(b) - scoreOf(a) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [posts, activeSpace, search, sort]);

  async function castVote(post: Post, value: number) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const existing = post.votes?.find((vote) => vote.user_id === user.id);
    let result;
    if (existing?.value === value) {
      result = await supabase.from('community_votes').delete().eq('post_id', post.id).eq('user_id', user.id);
    } else if (existing) {
      // Only the vote value is updated; the RLS-safe column grant keeps vote ownership immutable.
      result = await supabase.from('community_votes').update({ value }).eq('post_id', post.id).eq('user_id', user.id);
    } else {
      result = await supabase.from('community_votes').insert({
        post_id: post.id,
        user_id: user.id,
        value
      });
    }
    if (result.error) notify('Vote could not be saved: ' + result.error.message);
    else await loadFeed();
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!profileReady) {
      notify('Your profile is still being prepared. Please try again in a moment.');
      return;
    }
    const space = spaces.find((item) => item.slug === postSpace) ?? spaces[0];
    if (!space || !postTitle.trim()) return;
    const link = postLink.trim();
    if (link) {
      try {
        const parsed = new URL(link);
        if (parsed.protocol !== 'https:') throw new Error();
      } catch {
        notify('Please enter a valid HTTPS link.');
        return;
      }
    }
    setPosting(true);
    const { error } = await supabase.from('community_posts').insert({
      space_id: space.id,
      author_id: user.id,
      title: postTitle.trim(),
      body: postBody.trim(),
      link_url: link || null
    });
    setPosting(false);
    if (error) notify('Post could not be published: ' + error.message);
    else {
      setPostTitle('');
      setPostBody('');
      setPostLink('');
      setComposerOpen(false);
      setActiveSpace('all');
      setSort('new');
      notify('Your post is live.');
      await loadFeed();
    }
  }

  async function deletePost(post: Post) {
    if (!user || !window.confirm('Delete this post and its comments?')) return;
    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
    if (error) notify('Post could not be deleted: ' + error.message);
    else {
      notify('Post deleted.');
      await loadFeed();
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) notify(error.message);
    else notify('You are signed out.');
  }

  const activeSpaceInfo = spaces.find((space) => space.slug === activeSpace);

  return <div className="community-shell">
    <header className="community-header">
      <a className="community-brand" href="index.html" aria-label="Apokolips home">
        <img src="file_00000000a7ec820890154ca6ed49b608.png" alt="" />
        <span>APOKOLIPS<span className="brand-slash"> / </span><b>COMMUNITY</b></span>
      </a>
      <label className="header-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search discussions…" aria-label="Search discussions" /><kbd>⌘ K</kbd></label>
      <div className="header-actions">
        <a className="back-link" href="index.html">Main website ↗</a>
        {user ? <div className="user-chip"><Avatar name={String(user.user_metadata?.display_name || user.email || 'Member')} /><span>{String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member')}</span><button type="button" onClick={signOut}>Sign out</button></div> : <button className="primary-button sign-in-button" type="button" onClick={() => setAuthOpen(true)}>Sign in</button>}
      </div>
    </header>

    <div className="community-layout">
      <aside className="left-sidebar">
        <div className="sidebar-caption">YOUR SPACE</div>
        <button className={'side-link ' + (activeSpace === 'all' ? 'active' : '')} type="button" onClick={() => setActiveSpace('all')}><span>⌂</span> Home feed</button>
        <button className="side-link" type="button" onClick={() => { setComposerOpen(true); if (!user) setAuthOpen(true); }}><span>＋</span> Create a post</button>
        <div className="sidebar-divider" />
        <div className="sidebar-caption">EXPLORE COMMUNITIES</div>
        {spaces.map((space, index) => <button key={space.id} className={'community-nav-item ' + (activeSpace === space.slug ? 'active' : '')} type="button" onClick={() => setActiveSpace(space.slug)}>
          <span className={'community-symbol symbol-' + (index % 5)}>{space.name.charAt(0)}</span><span>{space.name}</span>
        </button>)}
        <div className="sidebar-bottom">
          <div className="mini-mark">A</div>
          <p>Ideas become something real.</p>
          <a href="index.html">About Apokolips ↗</a>
        </div>
      </aside>

      <main className="feed-column">
        <section className="feed-heading">
          <div><p className="eyebrow">THE APOKOLIPS NETWORK</p><h1>{activeSpaceInfo ? activeSpaceInfo.name : 'Find your people.'}</h1><p>{activeSpaceInfo?.description || 'A place to share ideas, ask questions, and build something together.'}</p></div>
          <div className="feed-heading-mark" aria-hidden="true">A<span>•</span></div>
        </section>

        <div className="composer-launch">
          <Avatar name={String(user?.user_metadata?.display_name || user?.email || 'You')} />
          <button type="button" onClick={() => user ? setComposerOpen(!composerOpen) : setAuthOpen(true)}>{user ? 'What would you like to share?' : 'Sign in to start a discussion…'}</button>
          <button type="button" className="composer-plus" onClick={() => user ? setComposerOpen(!composerOpen) : setAuthOpen(true)} aria-label="Create a post">＋</button>
        </div>

        {composerOpen && <form className="composer-card" onSubmit={createPost}>
          <div className="composer-topline"><strong>Create a post</strong><button type="button" className="icon-button" onClick={() => setComposerOpen(false)} aria-label="Close">×</button></div>
          <div className="composer-fields">
            <select value={postSpace} onChange={(event) => setPostSpace(event.target.value)} aria-label="Choose community">
              {spaces.map((space) => <option value={space.slug} key={space.id}>{space.name}</option>)}
            </select>
            <input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} maxLength={180} placeholder="Give your post a clear title" aria-label="Post title" required />
            <textarea value={postBody} onChange={(event) => setPostBody(event.target.value)} maxLength={10000} placeholder="Add context, details, or a question (optional)…" aria-label="Post text" rows={4} />
            <input value={postLink} onChange={(event) => setPostLink(event.target.value)} placeholder="Add a link (optional, HTTPS)" aria-label="Optional link" type="url" />
          </div>
          <div className="composer-actions"><span className="muted small-text">Be kind. Share thoughtfully. No spam.</span><button className="primary-button" type="submit" disabled={posting || !postTitle.trim() || !spaces.length}>{posting ? 'Publishing…' : 'Publish post'}</button></div>
        </form>}

        <div className="feed-toolbar">
          <div className="feed-toolbar-label"><span className="live-indicator" /> COMMUNITY FEED <span className="toolbar-count">{visiblePosts.length}</span></div>
          <div className="sort-tabs">
            <button type="button" className={sort === 'new' ? 'selected' : ''} onClick={() => setSort('new')}>New</button>
            <button type="button" className={sort === 'top' ? 'selected' : ''} onClick={() => setSort('top')}>Top</button>
          </div>
        </div>

        {loading && <div className="empty-card"><div className="loader" /><p>Loading conversations…</p></div>}
        {!loading && visiblePosts.length === 0 && <div className="empty-card">
          <div className="empty-icon">✳</div><h2>{search ? 'No matching discussions.' : 'A fresh start.'}</h2><p>{search ? 'Try a different search term.' : 'There are no posts here yet. Start a conversation and make this space yours.'}</p>
          <button className="primary-button" type="button" onClick={() => user ? setComposerOpen(true) : setAuthOpen(true)}>Create the first post</button>
        </div>}
        {!loading && visiblePosts.map((post) => <PostCard key={post.id} post={post} user={user} onNeedAuth={() => setAuthOpen(true)} onVote={castVote} onDelete={deletePost} />)}
        <div className="feed-end">YOU'RE ALL CAUGHT UP <span>✦</span></div>
      </main>

      <aside className="right-sidebar">
        <section className="welcome-card">
          <div className="welcome-mark">A<span>•</span></div>
          <p className="eyebrow">WELCOME TO THE COMMUNITY</p>
          <h2>Good ideas grow<br />when shared.</h2>
          <p>Meet curious people, exchange knowledge, and showcase the things you create.</p>
          {!user && <button className="primary-button full-button" type="button" onClick={() => setAuthOpen(true)}>Join the community</button>}
          {user && <div className="member-status"><span className="live-indicator" /> Signed in as @{usernameFrom(user)}</div>}
        </section>
        <section className="right-panel">
          <div className="right-panel-heading"><h3>Popular spaces</h3><span>EXPLORE</span></div>
          {spaces.slice(0, 5).map((space, index) => <button type="button" className="popular-space" key={space.id} onClick={() => setActiveSpace(space.slug)}>
            <span className={'popular-space-icon symbol-' + (index % 5)}>{space.name.charAt(0)}</span>
            <span><strong>{space.name}</strong><small>{space.description}</small></span><b>↗</b>
          </button>)}
        </section>
        <section className="guidelines-panel">
          <h3>Community guidelines</h3>
          <p><b>01</b> Be respectful and constructive.</p>
          <p><b>02</b> Keep posts relevant to the space.</p>
          <p><b>03</b> No spam, harassment, or harmful links.</p>
          <p><b>04</b> Credit the original creators.</p>
        </section>
        <div className="right-footer"><a href="index.html">Apokolips home</a><span>·</span><span>Built for good conversations</span></div>
      </aside>
    </div>

    {toast && <div className="toast-message" role="status">{toast}</div>}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onMessage={notify} onAuthenticated={() => { void loadFeed(); }} />}
  </div>;
}

createRoot(document.getElementById('community-root')!).render(<App />);
