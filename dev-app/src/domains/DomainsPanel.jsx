import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  DOMAIN_STATUSES,
  domainStatusLabel,
  domainStatusNote,
  domainTypeLabel,
  makeVerificationToken,
  validateDomainInput
} from './domain-utils.js';
import './domains.css';

function readableError(error) {
  if (error?.code === '23505') return 'This domain is already registered on Apokolips.';
  if (error?.code === '42501') return 'You do not have permission to manage domains in this workspace.';
  if (error?.code === '42P01' || error?.code === 'PGRST205') {
    return 'Domain storage is not ready. The Apokolips domain database migration must be applied.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}

export default function DomainsPanel({ workspaceId, projects, role, onNotice, onError }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [kind, setKind] = useState('custom_domain');
  const [domain, setDomain] = useState('');
  const [websiteId, setWebsiteId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const requestSequence = useRef(0);
  const canManage = role === 'owner' || role === 'editor';

  const load = useCallback(async () => {
    if (!workspaceId) {
      setDomains([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('builder_domains')
        .select('id,domain,domain_type,status,verification_token,website_id,created_at')
        .eq('workspace_id', workspaceId).order('created_at', { ascending: false });
      if (requestId !== requestSequence.current) return;
      if (error) throw error;
      setDomains(data || []);
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setDomains([]);
      onError(readableError(error));
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [workspaceId, onError]);

  useEffect(() => {
    void load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  useEffect(() => {
    setDomains([]);
    setDomain('');
    setWebsiteId('');
    setShowForm(false);
    setFilter('all');
  }, [workspaceId]);

  const visible = useMemo(
    () => filter === 'all' ? domains : domains.filter(item => item.status === filter),
    [domains, filter]
  );

  async function addDomain(event) {
    event.preventDefault();
    onError('');

    const validation = validateDomainInput(domain, kind);
    if (validation.error) {
      onError(validation.error);
      return;
    }
    if (!websiteId || !projects.some(project => project.id === websiteId)) {
      onError('Select a website from this workspace before adding the domain.');
      return;
    }
    if (domains.some(item => item.domain === validation.domain)) {
      onError('This domain is already registered in the current workspace.');
      return;
    }

    setSaving(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user?.id) throw new Error('Your session has expired. Sign in again and retry.');

      const { error } = await supabase.from('builder_domains').insert({
        workspace_id: workspaceId,
        website_id: websiteId,
        domain: validation.domain,
        domain_type: kind,
        verification_token: makeVerificationToken(),
        created_by: auth.user.id
      });
      if (error) throw error;

      setDomain('');
      setWebsiteId('');
      setShowForm(false);
      onNotice('Domain request saved. It is pending DNS ownership verification and platform routing.');
      await load();
    } catch (error) {
      onError(readableError(error));
    } finally {
      setSaving(false);
    }
  }

  async function removeDomain(id) {
    const item = domains.find(domainItem => domainItem.id === id);
    if (!item || removingId) return;
    if (!window.confirm('Remove ' + item.domain + ' from this workspace? This does not change DNS records at your registrar.')) return;

    setRemovingId(id);
    try {
      const { error } = await supabase.from('builder_domains')
        .delete().eq('id', id).eq('workspace_id', workspaceId);
      if (error) throw error;
      onNotice('Domain request removed.');
      await load();
    } catch (error) {
      onError(readableError(error));
    } finally {
      setRemovingId('');
    }
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      onNotice('Copied to clipboard.');
    } catch {
      onNotice('Clipboard access is blocked in this browser. Select the TXT value and copy it manually.');
    }
  }

  return <div className="domains-page">
    <div className="domains-heading">
      <div>
        <p className="eyebrow">DOMAIN MANAGEMENT</p>
        <h2>Your domains</h2>
        <p>Register custom domains, customer-owned subdomains, and Apokolips subdomains for your websites.</p>
      </div>
      {canManage && <button className="primary-button" onClick={() => setShowForm(value => !value)} disabled={!projects.length}>
        {showForm ? 'Cancel' : '＋ Add domain'}
      </button>}
    </div>

    <div className="domain-capabilities">
      <article><span>01</span><strong>Custom domains</strong><small>example.com</small></article>
      <article><span>02</span><strong>Your subdomains</strong><small>shop.example.com</small></article>
      <article><span>03</span><strong>Apokolips subdomains</strong><small>yourname.apokolips.xyz</small></article>
    </div>

    <div className="domain-infra-notice" role="note">
      <strong>Hosting compatibility notice</strong>
      <p>The current host serves websites by URL path (for example, www.sales.apokolips.xyz/your-site). This dashboard can securely register domain requests and issue TXT ownership challenges, but the current host does not yet route arbitrary hostnames or provision customer SSL certificates. Keep requests pending and do not change customer DNS records until Apokolips publishes the final routing target.</p>
    </div>

    {!projects.length && <p className="domain-readonly">Create a website in this workspace before registering a domain.</p>}

    {showForm && <form className="domain-form" onSubmit={addDomain}>
      <div className="domain-form-title">
        <div><h3>Register a domain</h3><p>Choose the address type and the website it should open.</p></div>
      </div>
      <label htmlFor="domain-kind">Domain type
        <select id="domain-kind" value={kind} onChange={event => setKind(event.target.value)}>
          <option value="custom_domain">Custom domain (example.com)</option>
          <option value="custom_subdomain">Your subdomain (shop.example.com)</option>
          <option value="apokolips_subdomain">Apokolips subdomain (name.apokolips.xyz)</option>
        </select>
      </label>
      <label htmlFor="domain-address">Domain address
        <input id="domain-address" value={domain} onChange={event => setDomain(event.target.value)}
          placeholder={kind === 'apokolips_subdomain' ? 'myproject.apokolips.xyz' : kind === 'custom_subdomain' ? 'shop.example.com' : 'example.com'}
          autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="off" required maxLength={253}/>
      </label>
      <label htmlFor="domain-website">Connect to website
        <select id="domain-website" value={websiteId} onChange={event => setWebsiteId(event.target.value)} required>
          <option value="">Select a website</option>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name} · {project.status}</option>)}
        </select>
      </label>
      <div className="domain-form-actions">
        <button className="secondary-button" type="button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
        <button className="primary-button" type="submit" disabled={saving || !canManage}>{saving ? 'Saving…' : 'Save domain request'}</button>
      </div>
    </form>}

    <div className="domain-list-head">
      <div><h3>Registered addresses</h3><p>{domains.length} domain request{domains.length === 1 ? '' : 's'} in this workspace</p></div>
      <label className="domain-filter-label" htmlFor="domain-status-filter">Filter
        <select id="domain-status-filter" aria-label="Filter domains" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {DOMAIN_STATUSES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
      </label>
    </div>

    {loading ? <div className="domain-empty" role="status">Loading domain requests…</div>
      : !workspaceId ? <div className="domain-empty"><h3>No workspace selected</h3><p>Select a workspace to view its domains.</p></div>
      : visible.length === 0 ? <div className="domain-empty">
        <span>⌁</span>
        <h3>{domains.length ? 'No matching domains' : 'No domains registered'}</h3>
        <p>{domains.length ? 'Choose another status filter to see more domain requests.' : 'Add a custom domain, your own subdomain, or an Apokolips subdomain to begin.'}</p>
      </div> : <div className="domain-cards">
        {visible.map(item => <article className="domain-card" key={item.id}>
          <div className="domain-card-top">
            <div><span className="domain-type">{domainTypeLabel(item.domain_type)}</span><h3>{item.domain}</h3></div>
            <span className={'domain-status status-' + item.status}>{domainStatusLabel(item.status)}</span>
          </div>
          <p className="domain-website">Website: {projects.find(project => project.id === item.website_id)?.name || 'Website unavailable'}</p>
          <div className="dns-challenge">
            <div className="dns-challenge-data">
              <span>DNS OWNERSHIP CHALLENGE · TXT RECORD</span>
              <strong>Record name</strong>
              <code>_apokolips-verify.{item.domain}</code>
              <strong>Record value</strong>
              <code>{item.verification_token}</code>
            </div>
            <div className="dns-challenge-actions">
              <button className="secondary-button" type="button" onClick={() => copy('_apokolips-verify.' + item.domain)}>Copy TXT name</button>
              <button className="secondary-button" type="button" onClick={() => copy(item.verification_token)}>Copy value</button>
            </div>
          </div>
          <p className="domain-pending-note">{domainStatusNote(item.status)}</p>
          {canManage && <button className="domain-remove" type="button" onClick={() => removeDomain(item.id)} disabled={removingId === item.id || Boolean(removingId)}>
            {removingId === item.id ? 'Removing…' : 'Remove request'}
          </button>}
        </article>)}
      </div>}

    {!canManage && <p className="domain-readonly">You have view-only access. Ask a workspace owner or editor to manage domains.</p>}
  </div>;
}
