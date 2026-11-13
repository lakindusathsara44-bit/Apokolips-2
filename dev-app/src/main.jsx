import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase.js';
import './styles.css';

const HOST = 'www.sales.apokolips.xyz';

function slugify(value) {
  return value.toLowerCase().trim().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function friendlyError(error) {
  const message = error?.message || 'Something went wrong. Please try again.';
  if (message.includes('Invalid login credentials')) return 'Email or password is incorrect.';
  if (message.includes('User already registered')) return 'An account with this email already exists. Sign in instead.';
  if (message.includes('Password should be')) return 'Use a password with at least 8 characters.';
  if (message.includes('duplicate key') || error?.code === '23505') return 'That project URL is already in use. Choose another slug.';
  if (message.includes('row-level security')) return 'Your account does not have permission to perform this action.';
  return message;
}

function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() || email.split('@')[0] },
            emailRedirectTo: window.location.href.split('#')[0]
          }
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('Account created. Check your email to confirm your address, then sign in.');
        } else {
          setMessage('Account created successfully.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <a className="brand auth-brand" href="./index.html"><span className="brand-mark">A</span><span>APOKOLIPS</span></a>
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">APOKOLIPS WEBSITE PLATFORM</p>
        <h1>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="auth-subtitle">{mode === 'signin' ? 'Sign in to manage your websites and projects.' : 'Register to start building websites with Apokolips.'}</p>
        {mode === 'signup' && <label>Your name<input autoComplete="name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" maxLength={80} /></label>}
        <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-message" role="status">{message}</div>}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</button>
        <p className="auth-switch">{mode === 'signin' ? 'New to Apokolips?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p>
      </form>
      <p className="auth-footnote">Secure account access · Powered by Apokolips</p>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [workspaceId, setWorkspaceId] = useState('');
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('websites');
  const [saving, setSaving] = useState(false);

  const previewUrl = useMemo(() => 'https://' + HOST + '/' + (slug || 'your-project'), [slug]);
  const activeWorkspace = workspaces.find(item => item.id === workspaceId);
  const activeRole = memberships.find(item => item.workspace_id === workspaceId)?.role || 'member';

  const loadWorkspace = useCallback(async (currentUser) => {
    setDataLoading(true);
    setError('');
    try {
      const [profileResult, membershipResult] = await Promise.all([
        supabase.from('builder_profiles').select('display_name,avatar_url').eq('user_id', currentUser.id).maybeSingle(),
        supabase.from('builder_workspace_members').select('workspace_id,role').eq('user_id', currentUser.id)
      ]);
      if (profileResult.error) throw profileResult.error;
      if (membershipResult.error) throw membershipResult.error;
      const memberRows = membershipResult.data || [];
      const ids = memberRows.map(row => row.workspace_id);
      setProfile(profileResult.data);
      setMemberships(memberRows);
      if (!ids.length) {
        setWorkspaces([]);
        setProjects([]);
        setWorkspaceId('');
        setError('No workspace is linked to this account yet. Please contact Apokolips support.');
        return;
      }
      const [workspaceResult, websiteResult] = await Promise.all([
        supabase.from('builder_workspaces').select('id,name').in('id', ids).order('created_at', { ascending: true }),
        supabase.from('builder_websites').select('id,name,slug,status,updated_at,workspace_id,hosting_namespace').in('workspace_id', ids).order('updated_at', { ascending: false })
      ]);
      if (workspaceResult.error) throw workspaceResult.error;
      if (websiteResult.error) throw websiteResult.error;
      const workspaceRows = workspaceResult.data || [];
      setWorkspaces(workspaceRows);
      setWorkspaceId(current => workspaceRows.some(row => row.id === current) ? current : workspaceRows[0]?.id || '');
      setProjects(websiteResult.data || []);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!alive) return;
      if (sessionError) setError(friendlyError(sessionError));
      setUser(data.session?.user || null);
      setAuthLoading(false);
      if (data.session?.user) void loadWorkspace(data.session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (nextUser) {
        Promise.resolve().then(() => loadWorkspace(nextUser));
      } else {
        setProfile(null);
        setWorkspaces([]);
        setMemberships([]);
        setProjects([]);
        setWorkspaceId('');
      }
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [loadWorkspace]);

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(friendlyError(signOutError));
  }

  function updateName(value) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function createProject(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    const safeSlug = slugify(slug);
    if (!name.trim() || !safeSlug || !workspaceId || !user) {
      setError('Enter a project name and a valid URL slug.');
      return;
    }
    if (projects.some(project => project.hosting_namespace === 'sales' && project.slug === safeSlug)) {
      setError('That project URL is already in use. Choose another slug.');
      return;
    }
    setSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from('builder_websites')
        .insert({
          workspace_id: workspaceId,
          name: name.trim(),
          slug: safeSlug,
          hosting_namespace: 'sales',
          created_by: user.id
        })
        .select('id,name,slug,status,updated_at,workspace_id,hosting_namespace')
        .single();
      if (insertError) throw insertError;
      setProjects(current => [data, ...current]);
      setName('');
      setSlug('');
      setSlugEdited(false);
      setShowCreate(false);
      setNotice('Website draft saved to your Apokolips account.');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl(projectSlug) {
    const url = 'https://' + HOST + '/' + projectSlug;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('Project URL copied.');
    } catch {
      setNotice(url);
    }
  }

  if (authLoading) return <main className="auth-layout"><div className="loading-panel">Loading your Apokolips workspace…</div></main>;
  if (!user) return <AuthScreen />;

  const visibleProjects = projects.filter(project => project.workspace_id === workspaceId);

  return (
    <div className="dev-shell">
      <aside className="sidebar">
        <a className="brand" href="./index.html"><span className="brand-mark">A</span><span>APOKOLIPS</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className={activeTab === 'websites' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('websites')}>▦ <span>My websites</span></button>
        <button className={activeTab === 'domains' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('domains')}>⌁ <span>Domains</span></button>
        <button className={activeTab === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('settings')}>⚙ <span>Settings</span></button>
        <div className="sidebar-bottom"><span className="status-dot"></span> Connected to Apokolips</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><span className="crumb">APOKOLIPS</span><span className="crumb-sep">/</span><strong>Dev</strong></div>
          <div className="account-actions"><span className="account-email">{user.email}</span><button className="secondary-button signout-button" onClick={signOut}>Sign out</button></div>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">WEBSITE DEVELOPMENT</p>
            <h1>Dev <span>Workspace</span></h1>
            <p className="subheading">Create, organise and prepare websites for Apokolips hosting.</p>
          </div>
          {activeTab === 'websites' && <button className="primary-button" onClick={() => { setShowCreate(true); setError(''); setNotice(''); }}>＋ Create website</button>}
        </section>

        <div className="connection-notice"><span className="connection-indicator"></span><div><strong>Apokolips database connected</strong><p>Your account, workspace and website drafts are saved securely. Live publishing and the visual editor will be enabled in upcoming phases.</p></div></div>

        {error && <div className="dashboard-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}
        {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}

        {activeTab === 'websites' && <>
          <div className="workspace-picker"><label htmlFor="workspace-select">WORKSPACE</label><select id="workspace-select" value={workspaceId} onChange={event => setWorkspaceId(event.target.value)}>{workspaces.map(workspace => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}</select><span>{activeRole}</span></div>
          <section className="stats-grid">
            <article className="stat-card"><span>WEBSITES</span><strong>{dataLoading ? '—' : visibleProjects.length}</strong><small>Saved projects</small></article>
            <article className="stat-card"><span>PUBLISHED</span><strong>{visibleProjects.filter(project => project.status === 'published').length}</strong><small>Live deployments</small></article>
            <article className="stat-card"><span>HOSTING</span><strong>Connected soon</strong><small>Publishing infrastructure is next</small></article>
          </section>
          <section className="section-block">
            <div className="section-title"><div><h2>Your websites</h2><p>Manage your website projects from one workspace.</p></div><span className="count">{visibleProjects.length} PROJECT{visibleProjects.length === 1 ? '' : 'S'}</span></div>
            {dataLoading ? <div className="empty-state"><p>Loading your saved websites…</p></div> : visibleProjects.length === 0 ? <div className="empty-state"><div className="empty-icon">▧</div><h2>No websites yet</h2><p>Create your first website project. Your draft will be saved to your Apokolips account.</p><button className="primary-button empty-create" onClick={() => setShowCreate(true)}>＋ Create website</button></div> : <div className="project-list">
              {visibleProjects.map(project => <article className="project-card" key={project.id}>
                <div className="project-icon">▧</div>
                <div className="project-info"><h3>{project.name}</h3><p>{HOST}/{project.slug}</p><small>Updated {new Date(project.updated_at).toLocaleDateString()}</small></div>
                <span className={project.status === 'published' ? 'published-badge' : 'draft-badge'}>{project.status}</span>
                <button className="secondary-button" onClick={() => copyUrl(project.slug)}>Copy URL</button>
                <button className="secondary-button disabled-button" disabled title="Visual editor is planned for the next phase">Editor next</button>
              </article>)}
            </div>}
          </section>
          <section className="section-block url-section">
            <div className="section-title"><div><h2>Website address format</h2><p>Every project receives a unique path under the shared Apokolips hosting hostname.</p></div></div>
            <div className="url-example"><span className="url-lock">https://</span><strong>{HOST}</strong><span className="url-path">/{visibleProjects[0]?.slug || 'your-project'}</span></div>
            <div className="url-parts"><div><b>www.sales.apokolips.xyz</b><span>Shared hosting endpoint</span></div><div><b>/your-project</b><span>Unique project slug saved in database</span></div></div>
          </section>
        </>}

        {activeTab === 'domains' && <section className="section-block empty-state"><div className="empty-icon">⌁</div><h2>Domain management</h2><p>Custom domain verification, DNS routing and SSL provisioning will be connected with the Apokolips hosting engine.</p></section>}
        {activeTab === 'settings' && <section className="section-block settings-panel"><div className="section-title"><div><h2>Account & workspace</h2><p>Your signed-in Apokolips identity and workspace information.</p></div></div><div className="settings-row"><span>Account email</span><strong>{user.email}</strong></div><div className="settings-row"><span>Display name</span><strong>{profile?.display_name || 'Not set'}</strong></div><div className="settings-row"><span>Workspace</span><strong>{activeWorkspace?.name || 'No workspace selected'}</strong></div><div className="settings-row"><span>Workspace role</span><strong>{activeRole}</strong></div><button className="secondary-button settings-signout" onClick={signOut}>Sign out</button></section>}

        <footer className="footer"><span>© {new Date().getFullYear()} APOKOLIPS</span><span>DEV WORKSPACE · PHASE 1</span></footer>
      </main>

      {showCreate && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !saving) setShowCreate(false); }}>
        <form className="create-modal" onSubmit={createProject}>
          <div className="modal-head"><div><p className="eyebrow">NEW PROJECT</p><h2>Create a website</h2></div><button type="button" className="close-button" onClick={() => setShowCreate(false)} aria-label="Close" disabled={saving}>×</button></div>
          <label>Project name<input value={name} onChange={event => updateName(event.target.value)} placeholder="My business website" autoFocus maxLength={80} required /></label>
          <label>Project URL slug<input value={slug} onChange={event => { setSlug(slugify(event.target.value)); setSlugEdited(true); }} placeholder="my-business-website" maxLength={48} required /></label>
          <div className="url-preview"><span>YOUR WEBSITE ADDRESS</span><strong>{previewUrl}</strong></div>
          <p className="form-hint">Your draft and URL slug are saved to your Apokolips workspace. The address becomes publicly active only after hosting is enabled and the website is published.</p>
          {error && <div className="auth-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Create draft'}</button></div>
        </form>
      </div>}
    </div>
  );
}

createRoot(document.getElementById('dev-root')).render(<App />);
