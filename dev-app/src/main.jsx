import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const HOST = 'www.sales.apokolips.xyz';
const initialProjects = [
  { id: 'demo-1', name: 'Project One', slug: 'usersnameofproject1', status: 'Draft', updated: 'Sample project' }
];

function slugify(value) {
  return value.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}

function App() {
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('websites');
  const previewUrl = useMemo(() => 'https://' + HOST + '/' + (slug || 'your-project'), [slug]);

  function updateName(value) {
    setName(value);
    setSlug(current => current ? slugify(value) : slugify(value));
  }

  function createProject(event) {
    event.preventDefault();
    const safeSlug = slugify(slug);
    if (!name.trim() || !safeSlug) {
      setNotice('Enter a project name and a valid URL slug.');
      return;
    }
    if (projects.some(project => project.slug === safeSlug)) {
      setNotice('That project URL is already used in this preview.');
      return;
    }
    setProjects(current => [...current, {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      slug: safeSlug,
      status: 'Draft',
      updated: 'Just created locally'
    }]);
    setName('');
    setSlug('');
    setShowCreate(false);
    setNotice('Preview project added locally. Cloud saving and publishing are not connected yet.');
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

  return (
    <div className="dev-shell">
      <aside className="sidebar">
        <a className="brand" href="./index.html"><span className="brand-mark">A</span><span>APOKOLIPS</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className={activeTab === 'websites' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('websites')}>▦ <span>My websites</span></button>
        <button className={activeTab === 'domains' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('domains')}>⌁ <span>Domains</span></button>
        <button className={activeTab === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('settings')}>⚙ <span>Settings</span></button>
        <div className="sidebar-bottom"><span className="status-dot"></span> Dev environment</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><span className="crumb">APOKOLIPS</span><span className="crumb-sep">/</span><strong>Dev</strong></div>
          <a className="back-link" href="./index.html">Back to main website ↗</a>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">WEBSITE DEVELOPMENT</p>
            <h1>Dev <span>Workspace</span></h1>
            <p className="subheading">Create, organise and prepare websites for Apokolips hosting.</p>
          </div>
          <button className="primary-button" onClick={() => { setShowCreate(true); setNotice(''); }}>＋ Create website</button>
        </section>

        <div className="prototype-notice"><span>i</span><div><strong>Development preview</strong><p>This is the first interface foundation. Projects are held in this browser session only; authentication, cloud database, visual editing and live publishing will be connected in later implementation steps.</p></div></div>

        {activeTab === 'websites' && <>
          <section className="stats-grid">
            <article className="stat-card"><span>WEBSITES</span><strong>{projects.length}</strong><small>In this preview</small></article>
            <article className="stat-card"><span>PUBLISHED</span><strong>0</strong><small>Live deployments</small></article>
            <article className="stat-card"><span>HOSTING</span><strong>Ready next</strong><small>Infrastructure not connected</small></article>
          </section>

          <section className="section-block">
            <div className="section-title"><div><h2>Your websites</h2><p>Manage your website projects from one workspace.</p></div><span className="count">{projects.length} PROJECT{projects.length === 1 ? '' : 'S'}</span></div>
            <div className="project-list">
              {projects.map(project => <article className="project-card" key={project.id}>
                <div className="project-icon">▧</div>
                <div className="project-info"><h3>{project.name}</h3><p>{HOST}/{project.slug}</p><small>{project.updated}</small></div>
                <span className="draft-badge">{project.status}</span>
                <button className="secondary-button" onClick={() => copyUrl(project.slug)}>Copy URL</button>
                <button className="secondary-button disabled-button" disabled title="Visual editor will be added in a later phase">Open editor</button>
              </article>)}
            </div>
          </section>

          <section className="section-block url-section">
            <div className="section-title"><div><h2>Website address format</h2><p>Customer websites use one shared hosting hostname and a unique project path.</p></div></div>
            <div className="url-example"><span className="url-lock">https://</span><strong>{HOST}</strong><span className="url-path">/{projects[0]?.slug || 'your-project'}</span></div>
            <div className="url-parts"><div><b>www.sales.apokolips.xyz</b><span>Shared hosting endpoint</span></div><div><b>/usersnameofproject1</b><span>Unique project slug / tenant route</span></div></div>
          </section>
        </>}

        {activeTab === 'domains' && <section className="section-block empty-state"><div className="empty-icon">⌁</div><h2>Domain management</h2><p>Domain verification, DNS routing and SSL provisioning will be connected when the Apokolips hosting infrastructure is implemented.</p></section>}
        {activeTab === 'settings' && <section className="section-block empty-state"><div className="empty-icon">⚙</div><h2>Workspace settings</h2><p>Account authentication, member roles and workspace preferences are planned for the Phase 1 backend integration.</p></section>}

        <footer className="footer"><span>© {new Date().getFullYear()} APOKOLIPS</span><span>DEV WORKSPACE · FOUNDATION PREVIEW</span></footer>
      </main>

      {showCreate && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowCreate(false); }}>
        <form className="create-modal" onSubmit={createProject}>
          <div className="modal-head"><div><p className="eyebrow">NEW PROJECT</p><h2>Create a website</h2></div><button type="button" className="close-button" onClick={() => setShowCreate(false)} aria-label="Close">×</button></div>
          <label>Project name<input value={name} onChange={event => updateName(event.target.value)} placeholder="My business website" autoFocus /></label>
          <label>Project URL slug<input value={slug} onChange={event => setSlug(slugify(event.target.value))} placeholder="my-business-website" /></label>
          <div className="url-preview"><span>YOUR WEBSITE ADDRESS</span><strong>{previewUrl}</strong></div>
          <p className="form-hint">The slug must be unique on the selected hosting hostname. You can change it before publishing.</p>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="primary-button">Create draft</button></div>
        </form>
      </div>}

      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    </div>
  );
}

createRoot(document.getElementById('dev-root')).render(<App />);
