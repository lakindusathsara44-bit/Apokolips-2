import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import './domains.css';

const HOST = 'www.sales.apokolips.xyz';
const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function normaliseDomain(value) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\.$/, '');
}
function makeToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'apokolips-verification=' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
function labelFor(kind) {
  return ({ custom_domain: 'Custom domain', custom_subdomain: 'Your subdomain', apokolips_subdomain: 'Apokolips subdomain' })[kind];
}

export default function DomainsPanel({ workspaceId, projects, role, onNotice, onError }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kind, setKind] = useState('custom_domain');
  const [domain, setDomain] = useState('');
  const [websiteId, setWebsiteId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const canManage = role === 'owner' || role === 'editor';

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    const { data, error } = await supabase.from('builder_domains')
      .select('id,domain,domain_type,status,verification_token,website_id,created_at')
      .eq('workspace_id', workspaceId).order('created_at', { ascending: false });
    if (error) onError(error.message);
    else setDomains(data || []);
    setLoading(false);
  }, [workspaceId, onError]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => filter === 'all' ? domains : domains.filter(item => item.status === filter), [domains, filter]);

  async function addDomain(event) {
    event.preventDefault();
    onError('');
    const host = normaliseDomain(domain);
    if (!DOMAIN_RE.test(host) || host.includes('..')) {
      onError('Enter a valid domain name without a path, protocol, port, or wildcard.');
      return;
    }
    if (kind === 'apokolips_subdomain' && !host.endsWith('.apokolips.xyz')) {
      onError('Apokolips subdomains must end with .apokolips.xyz.');
      return;
    }
    if (kind !== 'apokolips_subdomain' && host.endsWith('.apokolips.xyz')) {
      onError('Choose Apokolips subdomain for addresses under apokolips.xyz.');
      return;
    }
    if (kind === 'apokolips_subdomain' && host === 'apokolips.xyz') {
      onError('The root Apokolips domain cannot be registered as a subdomain.');
      return;
    }
    if (!websiteId) {
      onError('Select the website this address should belong to.');
      return;
    }
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('builder_domains').insert({
      workspace_id: workspaceId,
      website_id: websiteId,
      domain: host,
      domain_type: kind,
      verification_token: makeToken(),
      created_by: auth.user?.id
    });
    setSaving(false);
    if (error) {
      onError(error.code === '23505' ? 'This domain is already registered on Apokolips.' : error.message);
      return;
    }
    setDomain('');
    setShowForm(false);
    onNotice('Domain request saved. It will remain pending until DNS ownership and platform routing are configured.');
    await load();
  }

  async function removeDomain(id) {
    if (!window.confirm('Remove this domain request? This does not change DNS records at your registrar.')) return;
    const { error } = await supabase.from('builder_domains').delete().eq('id', id).eq('workspace_id', workspaceId);
    if (error) onError(error.message);
    else { onNotice('Domain request removed.'); await load(); }
  }

  async function copy(value) {
    try { await navigator.clipboard.writeText(value); onNotice('Copied to clipboard.'); }
    catch { onNotice(value); }
  }

  return <div className="domains-page">
    <div className="domains-heading">
      <div><p className="eyebrow">DOMAIN MANAGEMENT</p><h2>Your domains</h2><p>Register custom domains, customer-owned subdomains, and Apokolips subdomains for your websites.</p></div>
      {canManage && <button className="primary-button" onClick={() => setShowForm(value => !value)}>{showForm ? 'Cancel' : '＋ Add domain'}</button>}
    </div>

    <div className="domain-capabilities">
      <article><span>01</span><strong>Custom domains</strong><small>example.com / www.example.com</small></article>
      <article><span>02</span><strong>Your subdomains</strong><small>shop.example.com</small></article>
      <article><span>03</span><strong>Apokolips subdomains</strong><small>yourname.apokolips.xyz</small></article>
    </div>

    <div className="domain-infra-notice"><strong>Hosting compatibility notice</strong><p>The current production host serves websites by URL path (for example, {HOST}/your-site). It does not yet provide wildcard host routing, per-customer domain routing, DNS verification, or automatic SSL provisioning. This dashboard records domain requests and ownership challenges; adding a domain here does not make it live. Do not change your DNS records until Apokolips supplies the final routing target.</p></div>

    {showForm && <form className="domain-form" onSubmit={addDomain}>
      <div className="domain-form-title"><div><h3>Register a domain</h3><p>Choose the address type and the website it should open.</p></div></div>
      <label>Domain type<select value={kind} onChange={event => setKind(event.target.value)}><option value="custom_domain">Custom domain (example.com)</option><option value="custom_subdomain">Your subdomain (shop.example.com)</option><option value="apokolips_subdomain">Apokolips subdomain (name.apokolips.xyz)</option></select></label>
      <label>Domain address<input value={domain} onChange={event => setDomain(event.target.value)} placeholder={kind === 'apokolips_subdomain' ? 'myproject.apokolips.xyz' : kind === 'custom_subdomain' ? 'shop.example.com' : 'example.com'} autoCapitalize="none" autoCorrect="off" spellCheck="false" required maxLength={253}/></label>
      <label>Connect to website<select value={websiteId} onChange={event => setWebsiteId(event.target.value)} required><option value="">Select a website</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.status}</option>)}</select></label>
      <div className="domain-form-actions"><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving || !canManage}>{saving ? 'Saving…' : 'Save domain request'}</button></div>
    </form>}

    <div className="domain-list-head"><div><h3>Registered addresses</h3><p>{domains.length} domain request{domains.length === 1 ? '' : 's'} in this workspace</p></div><select aria-label="Filter domains" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All requests</option><option value="pending_setup">Pending setup</option></select></div>
    {loading ? <div className="domain-empty">Loading domain requests…</div> : visible.length === 0 ? <div className="domain-empty"><span>⌁</span><h3>No domains registered</h3><p>Add a custom domain, your own subdomain, or an Apokolips subdomain to begin.</p></div> : <div className="domain-cards">
      {visible.map(item => <article className="domain-card" key={item.id}>
        <div className="domain-card-top"><div><span className="domain-type">{labelFor(item.domain_type)}</span><h3>{item.domain}</h3></div><span className="domain-status">Pending setup</span></div>
        <p className="domain-website">Website: {projects.find(project => project.id === item.website_id)?.name || 'Website unavailable'}</p>
        <div className="dns-challenge"><div><span>OWNERSHIP CHALLENGE · TXT RECORD</span><strong>_apokolips-verify.{item.domain}</strong><code>{item.verification_token}</code></div><button className="secondary-button" onClick={() => copy(item.verification_token)}>Copy value</button></div>
        <p className="domain-pending-note">DNS ownership review and hostname routing are not automated yet. Keep this request pending; do not point live traffic at the current shared host.</p>
        {canManage && <button className="domain-remove" onClick={() => removeDomain(item.id)}>Remove request</button>}
      </article>)}
    </div>}
    {!canManage && <p className="domain-readonly">You have view-only access. Ask a workspace owner or editor to manage domains.</p>}
  </div>;
}
