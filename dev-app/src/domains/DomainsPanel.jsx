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

async function functionErrorMessage(error) {
  try {
    const response = error?.context;
    if (response?.clone) {
      const payload = await response.clone().json();
      if (payload?.message) return payload.message;
      if (payload?.error) return String(payload.error).replaceAll('_', ' ');
    }
  } catch {
    // Fall through to the SDK message when the response has no JSON body.
  }
  return readableError(error);
}

function validationRecords(item) {
  const records = Array.isArray(item.cloudflare_validation_records) ? item.cloudflare_validation_records : [];
  const ownership = item.cloudflare_ownership_verification;
  const all = [...records];
  if (ownership && typeof ownership === 'object') all.push({ ...ownership, _apokolipsOwnership: true });

  return all.map((record, index) => {
    const name = record.txt_name || record.name || record.hostname || record.http_url || record.http_uri || 'Cloudflare validation';
    const value = record.txt_value || record.value || record.http_body || '';
    const type = record.txt_name || record.txt_value ? 'TXT' : record.http_url || record.http_uri ? 'HTTP' : record.type || 'DNS';
    return { id: index + 1, name: String(name), value: String(value), type: String(type), ownership: Boolean(record._apokolipsOwnership) };
  }).filter(record => record.name || record.value);
}

export default function DomainsPanel({ workspaceId, projects, role, onNotice, onError }) {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');
  const [operating, setOperating] = useState('');
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
        .select('id,domain,domain_type,status,verification_token,website_id,created_at,verified_at,cloudflare_hostname_status,cloudflare_ssl_status,cloudflare_validation_records,cloudflare_ownership_verification,cname_target,last_cloudflare_check_at')
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
      onNotice(kind === 'apokolips_subdomain'
        ? 'Apokolips subdomain request saved. Platform wildcard routing must be enabled before it can be verified.'
        : 'Domain request saved. Add the TXT ownership record, then verify it from this page.');
      await load();
    } catch (error) {
      onError(readableError(error));
    } finally {
      setSaving(false);
    }
  }

  async function runDomainAction(item, action) {
    if (!canManage || operating) return;
    setOperating(item.id + ':' + action);
    onError('');
    try {
      const { data, error } = await supabase.functions.invoke('domain-control', {
        body: { action, domainId: item.id }
      });
      if (error) throw new Error(await functionErrorMessage(error));
      if (data?.error) throw new Error(data.message || String(data.error).replaceAll('_', ' '));
      onNotice(data?.message || 'Domain status updated.');
      await load();
    } catch (error) {
      onError(error.message || readableError(error));
      await load();
    } finally {
      setOperating('');
    }
  }

  async function removeDomain(id) {
    const item = domains.find(domainItem => domainItem.id === id);
    if (!item || removingId || operating) return;
    if (!window.confirm('Remove ' + item.domain + ' from this workspace? This does not change DNS records at your registrar or delete a Cloudflare hostname already created.')) return;

    setRemovingId(id);
    try {
      const { error } = await supabase.from('builder_domains')
        .delete().eq('id', id).eq('workspace_id', workspaceId);
      if (error) throw error;
      onNotice('Domain request removed from Apokolips. Any external DNS and Cloudflare resources must be cleaned up separately.');
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
      onNotice('Clipboard access is blocked in this browser. Select the value and copy it manually.');
    }
  }

  function actionButton(item, action, label, busyLabel) {
    const isBusy = operating === item.id + ':' + action;
    return <button className="secondary-button" type="button" onClick={() => runDomainAction(item, action)} disabled={Boolean(operating) || saving || removingId !== ''}>
      {isBusy ? busyLabel : label}
    </button>;
  }

  return <div className="domains-page">
    <div className="domains-heading">
      <div>
        <p className="eyebrow">DOMAIN MANAGEMENT</p>
        <h2>Your domains</h2>
        <p>Register custom domains, customer-owned subdomains, and Apokolips subdomains for your websites.</p>
      </div>
      {canManage && <button className="primary-button" onClick={() => setShowForm(value => !value)} disabled={!projects.length || Boolean(operating) || Boolean(removingId)}>
        {showForm ? 'Cancel' : '＋ Add domain'}
      </button>}
    </div>

    <div className="domain-capabilities">
      <article><span>01</span><strong>Custom domains</strong><small>example.com</small></article>
      <article><span>02</span><strong>Your subdomains</strong><small>shop.example.com</small></article>
      <article><span>03</span><strong>Apokolips subdomains</strong><small>yourname.apokolips.xyz</small></article>
    </div>

    <div className="domain-infra-notice" role="note">
      <strong>Important: domain activation requirements</strong>
      <p>DNS ownership can now be verified by Apokolips. Custom hostnames and SSL are provisioned through Cloudflare for SaaS only after the Apokolips Cloudflare zone, API token, fallback origin and Worker router are configured. Requests remain inactive until the provider confirms both hostname and certificate status. Do not change customer DNS to an unconfirmed target.</p>
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
        {visible.map(item => {
          const dnsRecords = validationRecords(item);
          return <article className="domain-card" key={item.id}>
            <div className="domain-card-top">
              <div><span className="domain-type">{domainTypeLabel(item.domain_type)}</span><h3>{item.domain}</h3></div>
              <span className={'domain-status status-' + item.status}>{domainStatusLabel(item.status)}</span>
            </div>
            <p className="domain-website">Website: {projects.find(project => project.id === item.website_id)?.name || 'Website unavailable'}</p>

            {item.status === 'pending_setup' && item.domain_type !== 'apokolips_subdomain' && <div className="dns-challenge">
              <div className="dns-challenge-data">
                <span>OWNERSHIP VERIFICATION · TXT RECORD</span>
                <strong>Record name</strong>
                <code>_apokolips-verify.{item.domain}</code>
                <strong>Record value</strong>
                <code>{item.verification_token}</code>
              </div>
              <div className="dns-challenge-actions">
                <button className="secondary-button" type="button" onClick={() => copy('_apokolips-verify.' + item.domain)}>Copy TXT name</button>
                <button className="secondary-button" type="button" onClick={() => copy(item.verification_token)}>Copy value</button>
              </div>
            </div>}

            {item.domain_type === 'apokolips_subdomain' && item.status === 'pending_setup' && <p className="domain-pending-note">No customer DNS change is required. Apokolips must first enable its wildcard DNS and Worker routing, then this platform address can be verified and activated.</p>}

            {item.status === 'provisioning' && item.cname_target && <div className="dns-challenge">
              <div className="dns-challenge-data">
                <span>CUSTOM HOSTNAME ROUTING · CNAME</span>
                <strong>Record name</strong>
                <code>{item.domain}</code>
                <strong>Record target</strong>
                <code>{item.cname_target}</code>
              </div>
              <div className="dns-challenge-actions">
                <button className="secondary-button" type="button" onClick={() => copy(item.cname_target)}>Copy CNAME target</button>
              </div>
            </div>}

            {dnsRecords.length > 0 && <div className="domain-validation-list">
              <span className="validation-list-title">CLOUDFLARE CERTIFICATE VALIDATION</span>
              {dnsRecords.map(record => <div className="domain-validation-record" key={record.id}>
                <div>
                  <strong>{record.type}{record.ownership ? ' · HOSTNAME OWNERSHIP' : ' · CERTIFICATE'}</strong>
                  <code>{record.name}</code>
                  {record.value && <code>{record.value}</code>}
                </div>
                {record.value && <button className="secondary-button" type="button" onClick={() => copy(record.value)}>Copy value</button>}
              </div>)}
            </div>}

            {item.cloudflare_hostname_status && <p className="domain-provider-status">
              Cloudflare hostname: <strong>{item.cloudflare_hostname_status}</strong>
              {item.cloudflare_ssl_status && <> · SSL: <strong>{item.cloudflare_ssl_status}</strong></>}
            </p>}

            <p className="domain-pending-note">{domainStatusNote(item.status)}</p>

            {canManage && <div className="domain-action-row">
              {item.status === 'pending_setup' && actionButton(item, 'verify', item.domain_type === 'apokolips_subdomain' ? 'Verify platform routing' : 'Verify DNS ownership', 'Verifying…')}
              {item.status === 'verified' && actionButton(item, 'provision', 'Provision hostname + SSL', 'Starting…')}
              {item.status === 'provisioning' && actionButton(item, 'refresh', 'Check provisioning status', 'Checking…')}
              {item.status === 'active' && <a className="secondary-button domain-visit" href={'https://' + item.domain + '/'} target="_blank" rel="noopener noreferrer">Visit website</a>}
              <button className="domain-remove" type="button" onClick={() => removeDomain(item.id)} disabled={Boolean(removingId) || Boolean(operating)}>
                {removingId === item.id ? 'Removing…' : 'Remove request'}
              </button>
            </div>}
          </article>;
        })}
      </div>}

    {!canManage && <p className="domain-readonly">You have view-only access. Ask a workspace owner or editor to manage domains.</p>}
  </div>;
}
