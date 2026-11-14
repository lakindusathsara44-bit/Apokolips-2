import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../../dev-app/src/lib/supabase.js';
import './styles.css';

const RESERVED = new Set(['api','assets','admin','health','_next','favicon.ico','404.html','sales.html']);
const safeSegment = value => {
  try {
    const decoded = decodeURIComponent(value);
    return /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(decoded) && !RESERVED.has(decoded) ? decoded : '';
  } catch { return ''; }
};


const parseObject = value => {try{const parsed=typeof value==='string'?JSON.parse(value||'{}'):value;return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};}catch{return {};}};
const tableHeaders = value => String(value||'Column 1, Column 2').split(',').map(x=>x.trim());
const tableRows = value => {try{const rows=JSON.parse(value||'[]');return Array.isArray(rows)?rows.map(row=>Array.isArray(row)?row:[]):[];}catch{return [];}};
const tableAttributes = object => {
  const aliases={class:'className',for:'htmlFor',colspan:'colSpan',rowspan:'rowSpan',cellpadding:'cellPadding',cellspacing:'cellSpacing',tabindex:'tabIndex',readonly:'readOnly'};
  const output={};
  Object.entries(object||{}).forEach(([key,value])=>{
    if(!/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(key)||/^on/i.test(key)||value===null||value===undefined||value===false)return;
    if(key.toLowerCase()==='style'){
      if(value&&typeof value==='object'&&!Array.isArray(value))output.style=value;
      else if(typeof value==='string'){const styles={};value.split(';').forEach(part=>{const at=part.indexOf(':');if(at>0)styles[part.slice(0,at).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=part.slice(at+1).trim();});if(Object.keys(styles).length)output.style=styles;}
    } else output[aliases[key.toLowerCase()]||key]=value===true?'':value;
  });
  return output;
};

function Block({ item }) {
  const p = item.properties || {};
  switch (item.component_type) {
    case 'heading': {
      const Tag = 'h' + Math.min(3, Math.max(1, Number(p.level) || 1));
      return <Tag style={{ textAlign: p.align || 'left', color: p.color || '#172033' }}>{p.text || ''}</Tag>;
    }
    case 'text': return <p className="sales-text" style={{ textAlign: p.align || 'left', color: p.color || '#536174' }}>{p.text || ''}</p>;
    case 'button': return <a className={'sales-button ' + (p.variant === 'secondary' ? 'secondary' : '')} href={safeHref(p.href)}>{p.text || 'Learn more'}</a>;
    case 'image': return p.src ? <img className="sales-image" src={p.src} alt={p.alt || ''} loading="lazy"/> : null;
    case 'container': return <section className="sales-container" style={{ background: safeColor(p.background, '#f4f7fb'), padding: clampNumber(p.padding, 8, 120, 24) }}>{p.text || ''}</section>;
    case 'columns': return <section className="sales-columns"><div>{p.left || ''}</div><div>{p.right || ''}</div></section>;
    case 'card': return <article className="sales-card"><h2>{p.title || ''}</h2><p>{p.text || ''}</p></article>;
    case 'navbar': return <nav className="sales-nav"><strong>{p.brand || ' '}</strong><div>{String(p.links || '').split(',').map(x => x.trim()).filter(Boolean).map((x,i) => <a key={i} href={'#' + x.toLowerCase().replace(/[^a-z0-9]+/g,'-')}>{x}</a>)}</div></nav>;
    case 'table': {
      const headers=tableHeaders(p.headers),rows=tableRows(p.rows);
      const tableProps=tableAttributes(parseObject(p.tableAttributes));
      const headerProps=tableAttributes({scope:'col',...parseObject(p.headerAttributes)});
      const cellProps=tableAttributes(parseObject(p.cellAttributes));
      return <div className="sales-table-wrap"><table {...tableProps} className={'sales-table '+(tableProps.className||'')}>
        {p.caption&&<caption>{p.caption}</caption>}
        <thead><tr>{headers.map((header,index)=><th key={index} {...headerProps}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row,rowIndex)=><tr key={rowIndex}>{headers.map((_,colIndex)=><td key={colIndex} {...cellProps}>{row[colIndex]??''}</td>)}</tr>)}</tbody>
      </table></div>;
    }
    case 'footer': return <footer className="sales-footer">{p.text || ''}</footer>;
    default: return null;
  }
}
function pageBackgroundStyle(settings={}) {
  const image=String(settings.backgroundImage||'').trim();
  const safeImage=/^https:\/\//i.test(image)?image.replace(/["\\\n\r]/g,''):'';
  return {
    backgroundColor:safeColor(settings.backgroundColor,'#ffffff'),
    backgroundImage:safeImage?'url("'+safeImage+'")':'none',
    backgroundSize:['cover','contain','auto'].includes(settings.backgroundSize)?settings.backgroundSize:'cover',
    backgroundPosition:['center center','top center','bottom center','left center','right center','left top','right top','left bottom','right bottom'].includes(settings.backgroundPosition)?settings.backgroundPosition:'center center',
    backgroundRepeat:['no-repeat','repeat','repeat-x','repeat-y'].includes(settings.backgroundRepeat)?settings.backgroundRepeat:'no-repeat',
    backgroundAttachment:['scroll','fixed'].includes(settings.backgroundAttachment)?settings.backgroundAttachment:'scroll'
  };
}
function safeHref(value) {
  const href = String(value || '#');
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(href) && !/^\/\//.test(href)) return href;
  return '#';
}
function safeColor(value, fallback) { return /^#[0-9a-f]{6}$/i.test(String(value)) ? value : fallback; }
function clampNumber(value, min, max, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) + 'px' : fallback + 'px'; }

function App() {
  const [state, setState] = useState({ loading: true, website: null, page: null, blocks: [], error: '' });
  useEffect(() => {
    let alive = true;
    async function load() {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const siteSlug = safeSegment(parts[0] || '');
      const pageSlug = safeSegment(parts[1] || 'home') || 'home';
      if (!siteSlug) { if (alive) setState({ loading:false, website:null, page:null, blocks:[], error:'This page is not available.' }); return; }
      const { data: site, error: siteError } = await supabase.from('builder_websites')
        .select('id,name,slug,status').eq('slug', siteSlug).eq('hosting_namespace','sales').eq('status','published').maybeSingle();
      if (siteError || !site) { if (alive) setState({ loading:false, website:null, page:null, blocks:[], error:'This website is unavailable or has not been published.' }); return; }
      const pageQuery = supabase.from('builder_website_pages').select('id,title,slug,is_homepage,settings')
        .eq('website_id', site.id);
      const { data: page, error: pageError } = pageSlug === 'home'
        ? await pageQuery.eq('is_homepage', true).maybeSingle()
        : await pageQuery.eq('slug', pageSlug).maybeSingle();
      if (pageError || !page) { if (alive) setState({ loading:false, website:site, page:null, blocks:[], error:'This page could not be found.' }); return; }
      const { data: blocks, error: blocksError } = await supabase.from('builder_page_components')
        .select('id,component_type,properties,sort_order').eq('page_id', page.id).order('sort_order');
      if (alive) setState({ loading:false, website:site, page, blocks:blocksError ? [] : (blocks || []), error:blocksError ? 'This page could not be loaded.' : '' });
    }
    void load();
    return () => { alive = false; };
  }, []);
  useEffect(() => { if (state.website && state.page) document.title = state.page.title + ' | ' + state.website.name; }, [state.website,state.page]);
  if (state.loading) return <main className="sales-state">Loading website…</main>;
  if (state.error) return <main className="sales-state"><div><b>APOKOLIPS</b><h1>{state.error}</h1><p>Published websites are served from the Apokolips platform.</p></div></main>;
  return <main className="sales-site" style={pageBackgroundStyle(state.page.settings)}><div className="sales-page">{state.blocks.map(item => <Block key={item.id} item={item}/>)}</div><div className="sales-credit">Published with Apokolips</div></main>;
}
createRoot(document.getElementById('sales-root')).render(<App/>);