import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const HTML_TAGS = 'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr'.split(' ');
const VOID_TAGS = new Set('area base br col embed hr img input link meta source track wbr'.split(' '));
const TYPES = [
  ['heading','Heading','Aa'],['text','Text','¶'],['button','Button','▰'],
  ['image','Image','▧'],['container','Container','▱'],['columns','Columns','▥'],
  ['card','Card','▣'],['navbar','Navigation','☰'],['footer','Footer','⌄'],
  ['table','Table','▦'],['html','HTML element','<>']
];
const defaults = {
  heading:{text:'A clear headline for your website',level:1,align:'left',color:'#172033'},
  text:{text:'Add a short description to explain what you offer. Keep it useful and easy to read.',align:'left',color:'#536174'},
  button:{text:'Get started',href:'#contact',variant:'primary'},
  image:{src:'',alt:'Describe this image',width:'100%'},
  container:{background:'#f4f7fb',padding:28},
  columns:{left:'First column content',right:'Second column content'},
  card:{title:'Feature title',text:'Describe a useful feature or service.'},
  navbar:{brand:'Your brand',links:'Home, About, Contact'},
  footer:{text:'© Your brand. All rights reserved.'},
  table:{caption:'Data table',headers:'Name, Description, Status',rows:'[["Item 1","First row","Active"],["Item 2","Second row","Pending"]]',tableAttributes:'{}',headerAttributes:'{}',cellAttributes:'{}'},
  html:{tag:'div',content:'Custom HTML element',attributes:'{}',styles:'{}',customCSS:'',customJS:''}
};
const clone = value => JSON.parse(JSON.stringify(value));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const makeExportMarkup = item => {
  const p=item.properties||{};
  const style=[p._width?'width:'+Math.max(80,Number(p._width))+'px':'',p._height?'min-height:'+Math.max(40,Number(p._height))+'px':''].filter(Boolean).join(';');
  const attr=style?' style="'+style+'"':'';
  switch(item.component_type){
    case 'heading': {const level=Math.min(3,Math.max(1,Number(p.level)||1));return '<section class="block"'+attr+'><h'+level+' style="text-align:'+escapeHtml(p.align||'left')+';color:'+escapeHtml(p.color||'#172033')+'">'+escapeHtml(p.text||'Your heading')+'</h'+level+'></section>';}
    case 'text': return '<section class="block"'+attr+'><p style="text-align:'+escapeHtml(p.align||'left')+';color:'+escapeHtml(p.color||'#536174')+'">'+escapeHtml(p.text||'')+'</p></section>';
    case 'button': return '<section class="block"'+attr+'><a class="button '+(p.variant==='secondary'?'secondary':'')+'" href="'+escapeHtml(p.href||'#')+'">'+escapeHtml(p.text||'Button')+'</a></section>';
    case 'image': return '<section class="block"'+attr+'>'+(p.src?'<img class="image" src="'+escapeHtml(p.src)+'" alt="'+escapeHtml(p.alt||'')+'">':'<div class="image-placeholder">Image not configured</div>')+'</section>';
    case 'container': return '<section class="block container"'+attr+' style="background:'+escapeHtml(p.background||'#f4f7fb')+';padding:'+Math.max(0,Number(p.padding)||24)+'px">'+escapeHtml(p.text||'')+'</section>';
    case 'columns': return '<section class="block columns"'+attr+'><div>'+escapeHtml(p.left||'')+'</div><div>'+escapeHtml(p.right||'')+'</div></section>';
    case 'card': return '<section class="block"'+attr+'><article class="card"><h3>'+escapeHtml(p.title||'Card title')+'</h3><p>'+escapeHtml(p.text||'')+'</p></article></section>';
    case 'navbar': return '<header class="block navbar"'+attr+'><strong>'+escapeHtml(p.brand||'Brand')+'</strong><nav>'+(p.links||'Home, About, Contact').split(',').map(x=>x.trim()).filter(Boolean).map(x=>'<a href="#'+escapeHtml(x.toLowerCase().replace(/[^a-z0-9]+/g,'-'))+'">'+escapeHtml(x)+'</a>').join('')+'</nav></header>';
    case 'footer': return '<footer class="block footer"'+attr+'>'+escapeHtml(p.text||'')+'</footer>';
    case 'table': {const headers=(p.headers||'Column 1, Column 2').split(',').map(x=>x.trim());let rows=[],ta={},ha={},ca={};try{rows=JSON.parse(p.rows||'[]')}catch{}try{ta=JSON.parse(p.tableAttributes||'{}')}catch{}try{ha=JSON.parse(p.headerAttributes||'{}')}catch{}try{ca=JSON.parse(p.cellAttributes||'{}')}catch{}const attrs=o=>Object.entries(o).filter(([k])=>/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(k)&&!/^on/i.test(k)).map(([k,v])=>' '+k+'="'+escapeHtml(v)+'"').join('');return '<section class="block"'+attr+'><table class="builder-table"'+attrs(ta)+'><caption>'+escapeHtml(p.caption||'')+'</caption><thead><tr>'+headers.map(x=>'<th scope="col"'+attrs(ha)+'>'+escapeHtml(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+headers.map((_,i)=>'<td'+attrs(ca)+'>'+escapeHtml(row&&row[i]!==undefined?row[i]:'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></section>';}
    case 'html': {const tag=HTML_TAGS.includes(p.tag)?p.tag:'div';let attrs={},styles={};try{attrs=JSON.parse(p.attributes||'{}')}catch{}try{styles=JSON.parse(p.styles||'{}')}catch{}const attrText=Object.entries(attrs).filter(([k])=>/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(k)&&!/^on/i.test(k)&&k!=='style').map(([k,v])=>' '+k+'="'+escapeHtml(v)+'"').join('');const css=Object.entries(styles).map(([k,v])=>k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())+':'+String(v)).join(';');return (p.customCSS?'<style>'+String(p.customCSS).replace(/<\\/style/gi,'')+'</style>':'')+'<'+tag+attr+(css?' style="'+escapeHtml(css)+'"':'')+attrText+'>'+(VOID_TAGS.has(tag)?'':escapeHtml(p.content||'')+'</'+tag+'>');}
    default:return '';
  }
};
const crc32 = bytes => {let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
const createZipBlob = files => {
  const encoder=new TextEncoder(),local=[],central=[];let offset=0;
  const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  for(const file of files){const name=encoder.encode(file.name),data=encoder.encode(file.content),crc=crc32(data);
    const lh=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name]);
    local.push(lh,data);
    const ch=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);
    central.push(ch);offset+=lh.length+data.length;
  }
  const centralSize=central.reduce((n,x)=>n+x.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(centralSize),...u32(offset),...u16(0)]);
  return new Blob([...local,...central,end],{type:'application/zip'});
};
const makeLocalId = () => 'local-' + Math.random().toString(36).slice(2,11);

function renderBlock(item, selected, onSelect, preview, onResizeStart) {
  const p=item.properties||{};
  const common={
    onClick:()=>!preview&&onSelect(item.id),
    onPointerDown:e=>{
      if(preview||!selected||!onResizeStart)return;
      const rect=e.currentTarget.getBoundingClientRect();
      if(rect.right-e.clientX<=22&&rect.bottom-e.clientY<=22)onResizeStart(item.id,e,rect);
    },
    style:{width:p._width?Math.max(80,Number(p._width))+'px':undefined,height:p._height?Math.max(40,Number(p._height))+'px':undefined,boxSizing:'border-box'},
    className:(preview?'preview-block':'canvas-block')+(selected&&!preview?' selected':'')
  };
  switch(item.component_type){
    case 'heading': return <div {...common}><span className="block-kind">HEADING</span>{React.createElement('h'+Math.min(3,Math.max(1,Number(p.level)||1)),{style:{textAlign:p.align||'left',color:p.color||'#172033'}},p.text||'Your heading')}</div>;
    case 'text': return <div {...common}><span className="block-kind">TEXT</span><p style={{textAlign:p.align||'left',color:p.color||'#536174'}}>{p.text||'Your text'}</p></div>;
    case 'button': return <div {...common}><span className="block-kind">BUTTON</span><span className={'site-button '+(p.variant==='secondary'?'secondary':'')}>{p.text||'Button'}</span></div>;
    case 'image': return <div {...common}><span className="block-kind">IMAGE</span>{p.src?<img className="site-image" src={p.src} alt={p.alt||''}/>:<div className="image-placeholder">Add an image URL in the properties panel</div>}</div>;
    case 'container': return <div {...common}><span className="block-kind">CONTAINER</span><div style={{background:p.background||'#f4f7fb',padding:Number(p.padding)||24,borderRadius:8,color:'#273449'}}>{p.text||'Container section — add content in properties'}</div></div>;
    case 'columns': return <div {...common}><span className="block-kind">COLUMNS</span><div className="site-columns"><p>{p.left||'Column one'}</p><p>{p.right||'Column two'}</p></div></div>;
    case 'card': return <div {...common}><span className="block-kind">CARD</span><div className="site-card"><h3>{p.title||'Card title'}</h3><p>{p.text||'Card description'}</p></div></div>;
    case 'navbar': return <div {...common}><span className="block-kind">NAVIGATION</span><nav className="site-nav"><b>{p.brand||'Brand'}</b><span>{(p.links||'Home, About, Contact').split(',').map(x=>x.trim()).filter(Boolean).join('   ·   ')}</span></nav></div>;
    case 'footer': return <div {...common}><span className="block-kind">FOOTER</span><footer className="site-footer">{p.text||'Footer text'}</footer></div>;
    case 'table': {const headers=(p.headers||'Column 1, Column 2').split(',').map(x=>x.trim());let rows=[],ta={},ha={},ca={};try{rows=JSON.parse(p.rows||'[]')}catch{}try{ta=JSON.parse(p.tableAttributes||'{}')}catch{}try{ha=JSON.parse(p.headerAttributes||'{}')}catch{}try{ca=JSON.parse(p.cellAttributes||'{}')}catch{}const clean=o=>{const out={};Object.entries(o).forEach(([k,v])=>{if(/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(k)&&!/^on/i.test(k))out[k]=v});return out;};return <div {...common}><span className="block-kind">TABLE</span><table className="builder-table" {...clean(ta)}><caption>{p.caption}</caption><thead><tr>{headers.map((h,i)=><th key={i} {...clean(ha)}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{headers.map((_,j)=><td key={j} {...clean(ca)}>{row&&row[j]!==undefined?row[j]:''}</td>)}</tr>)}</tbody></table></div>;}
    case 'html': {const tag=HTML_TAGS.includes(p.tag)?p.tag:'div';let attrs={},styles={};try{attrs=JSON.parse(p.attributes||'{}')}catch{}try{styles=JSON.parse(p.styles||'{}')}catch{}const safeAttrs={};Object.entries(attrs).forEach(([k,v])=>{if(/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/.test(k)&&!/^on/i.test(k)&&k!=='style')safeAttrs[k==='class'?'className':k==='for'?'htmlFor':k]=v;});const safeStyles={};Object.entries(styles).forEach(([k,v])=>{if(/^[a-zA-Z][a-zA-Z0-9]*$/.test(k))safeStyles[k]=v;});return <div {...common}><span className="block-kind">HTML · &lt;{tag}&gt;</span>{React.createElement(tag,{...safeAttrs,style:safeStyles},VOID_TAGS.has(tag)?undefined:(p.content||''))}</div>;}
    default:return null;
  }
}

export default function BuilderEditor({website,user,onBack}) {
  const [pages,setPages]=useState([]);
  const [pageId,setPageId]=useState('');
  const [blocks,setBlocks]=useState([]);
  const [selected,setSelected]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [message,setMessage]=useState('All changes saved');
  const [error,setError]=useState('');
  const [device,setDevice]=useState('desktop');
  const [tab,setTab]=useState('properties');
  const [showJson,setShowJson]=useState(false);
  const [jsonText,setJsonText]=useState('');
  const [history,setHistory]=useState([]);
  const [future,setFuture]=useState([]);
  const [pageName,setPageName]=useState('');
  const [showPageForm,setShowPageForm]=useState(false);
  const [publishStatus,setPublishStatus]=useState(website.status||'draft');
  const [publishing,setPublishing]=useState(false);
  const [publishNotice,setPublishNotice]=useState('');
  const dragId=useRef(null);
  const resizeSession=useRef(null);

  const startResize=(id,event,rect)=>{
    event.preventDefault();
    event.stopPropagation();
    resizeSession.current={id,startX:event.clientX,startY:event.clientY,startWidth:rect.width,startHeight:rect.height,originalBlocks:clone(blocks)};
    const moveResize=e=>{
      const session=resizeSession.current;
      if(!session)return;
      const width=Math.max(80,Math.round(session.startWidth+e.clientX-session.startX));
      const height=Math.max(40,Math.round(session.startHeight+e.clientY-session.startY));
      setBlocks(current=>current.map(b=>b.id===session.id?{...b,properties:{...b.properties,_width:width,_height:height}}:b));
      setDirty(true);setMessage('Unsaved changes');
    };
    const endResize=()=>{
      const session=resizeSession.current;
      if(!session)return;
      setHistory(h=>[...h.slice(-39),session.originalBlocks]);setFuture([]);
      resizeSession.current=null;
      window.removeEventListener('pointermove',moveResize);
      window.removeEventListener('pointerup',endResize);
      window.removeEventListener('pointercancel',endResize);
    };
    window.addEventListener('pointermove',moveResize);
    window.addEventListener('pointerup',endResize);
    window.addEventListener('pointercancel',endResize);
  };
  const savingRef=useRef(false);
  const selectedBlock=blocks.find(x=>x.id===selected)||null;
  const page=pages.find(x=>x.id===pageId)||null;

  const load = useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data:pageRows,error:pageError}=await supabase.from('builder_website_pages').select('id,title,slug,page_order,is_homepage').eq('website_id',website.id).order('page_order');
      if(pageError)throw pageError;
      const rows=pageRows||[];setPages(rows);
      const active=rows.find(x=>x.id===pageId)||rows[0];setPageId(active?.id||'');
      if(active){
        const {data:items,error:itemError}=await supabase.from('builder_page_components').select('id,page_id,component_type,properties,sort_order').eq('page_id',active.id).order('sort_order');
        if(itemError)throw itemError;
        setBlocks(items||[]);setSelected(items?.[0]?.id||'');
      }else setBlocks([]);
      setDirty(false);setMessage('All changes saved');
    }catch(e){setError(e.message||'Could not load this page.');}
    finally{setLoading(false);}
  },[website.id,pageId]);

  useEffect(()=>{void load();},[website.id]);

  const record=(next)=>{
    setHistory(h=>[...h.slice(-39),clone(blocks)]);setFuture([]);setBlocks(next);setDirty(true);setMessage('Unsaved changes');
  };
  const addBlock=(type,overrides={})=>{
    const item={id:makeLocalId(),page_id:pageId,component_type:type,properties:{...clone(defaults[type]),...overrides},sort_order:blocks.length};
    record([...blocks,item]);setSelected(item.id);setTab('properties');
  };
  const updateProp=(key,value)=>{
    if(!selectedBlock)return;
    record(blocks.map(b=>b.id===selected?{...b,properties:{...b.properties,[key]:value}}:b));
  };
  const removeSelected=()=>{
    if(!selectedBlock)return;
    record(blocks.filter(b=>b.id!==selected));setSelected('');
  };
  const move=(id,delta)=>{
    const index=blocks.findIndex(b=>b.id===id),target=index+delta;
    if(index<0||target<0||target>=blocks.length)return;
    const next=[...blocks];[next[index],next[target]]=[next[target],next[index]];
    record(next.map((b,i)=>({...b,sort_order:i})));
  };
  const undo=()=>{if(!history.length)return;const previous=history[history.length-1];setFuture(f=>[clone(blocks),...f]);setHistory(h=>h.slice(0,-1));setBlocks(previous);setDirty(true);setMessage('Unsaved changes');};
  const redo=()=>{if(!future.length)return;setHistory(h=>[...h,clone(blocks)]);setBlocks(future[0]);setFuture(f=>f.slice(1));setDirty(true);setMessage('Unsaved changes');};

  const save=useCallback(async()=>{
    if(!dirty||savingRef.current||!pageId)return;
    savingRef.current=true;setSaving(true);setMessage('Saving…');setError('');
    try{
      const {data:existing,error:readError}=await supabase.from('builder_page_components').select('id').eq('page_id',pageId);
      if(readError)throw readError;
      const localIds=blocks.filter(b=>!b.id.startsWith('local-')).map(b=>b.id);
      const remove=(existing||[]).filter(x=>!localIds.includes(x.id)).map(x=>x.id);
      if(remove.length){const {error:e}=await supabase.from('builder_page_components').delete().in('id',remove);if(e)throw e;}
      for(let i=0;i<blocks.length;i++){
        const b=blocks[i];const payload={page_id:pageId,component_type:b.component_type,properties:b.properties||{},sort_order:i};
        const result=b.id.startsWith('local-')
          ?await supabase.from('builder_page_components').insert(payload)
          :await supabase.from('builder_page_components').update(payload).eq('id',b.id);
        if(result.error)throw result.error;
      }
      const {data:confirmed,error:confirmError}=await supabase.from('builder_page_components').select('id,page_id,component_type,properties,sort_order').eq('page_id',pageId).order('sort_order');
      if(confirmError)throw confirmError;
      setBlocks(confirmed||[]);setSelected(current=>(confirmed||[]).some(x=>x.id===current)?current:confirmed?.[0]?.id||'');
      setDirty(false);setMessage('All changes saved');
    }catch(e){setError(e.message||'Save failed. Your changes are still in this editor.');setMessage('Save failed');}
    finally{savingRef.current=false;setSaving(false);}
  },[dirty,pageId,blocks]);

  useEffect(()=>{if(!dirty||loading)return;const timer=setTimeout(()=>void save(),1000);return()=>clearTimeout(timer);},[dirty,loading,save]);
  useEffect(()=>{const handler=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();void save();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);});

  async function togglePublish(){
    if(dirty||saving){setPublishNotice('Save all changes before publishing.');return;}
    setPublishing(true);setPublishNotice('');
    try{
      const action=publishStatus==='published'?'unpublish_builder_website':'publish_builder_website';
      const {data,error}=await supabase.rpc(action,{p_website_id:website.id});
      if(error)throw error;
      setPublishStatus(publishStatus==='published'?'draft':'published');
      setPublishNotice(publishStatus==='published'?'Website unpublished.':'Website published successfully.');
    }catch(error){setPublishNotice(error.message||'Could not update publishing status.');}
    finally{setPublishing(false);}
  }

  async function addPage(e){
    e.preventDefault();const title=pageName.trim();const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    if(!title||!slug)return;
    const {data,error:e2}=await supabase.from('builder_website_pages').insert({website_id:website.id,title,slug,page_order:pages.length,is_homepage:false}).select('id,title,slug,page_order,is_homepage').single();
    if(e2){setError(e2.message);return;}
    setPages(p=>[...p,data]);setPageId(data.id);setBlocks([]);setSelected('');setDirty(false);setPageName('');setShowPageForm(false);
  }
  async function switchPage(id){
    if(dirty){await save();}
    const {data,error:e}=await supabase.from('builder_page_components').select('id,page_id,component_type,properties,sort_order').eq('page_id',id).order('sort_order');
    if(e){setError(e.message);return;}
    setPageId(id);setBlocks(data||[]);setSelected(data?.[0]?.id||'');setDirty(false);setHistory([]);setFuture([]);
  }
  function dragStart(id){dragId.current=id;}
  function dropOn(id,event){
    const paletteType=event?.dataTransfer?.getData('builder-component-type');
    if(paletteType&&TYPES.some(t=>t[0]===paletteType)){event.preventDefault();addBlock(paletteType);return;}
    const htmlTag=event?.dataTransfer?.getData('builder-html-tag');
    if(htmlTag&&HTML_TAGS.includes(htmlTag)){event.preventDefault();addBlock('html',{tag:htmlTag});return;}
    const from=blocks.findIndex(b=>b.id===dragId.current),to=blocks.findIndex(b=>b.id===id);
    if(from<0||to<0||from===to)return;
    const next=[...blocks];const [item]=next.splice(from,1);next.splice(to,0,item);record(next.map((b,i)=>({...b,sort_order:i})));dragId.current=null;
  }
  const exportJson=()=>{const blob=new Blob([JSON.stringify({website:website.name,page:page?.title,components:blocks.map(({component_type,properties,sort_order})=>({component_type,properties,sort_order}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(page?.slug||'page')+'-layout.json';a.click();URL.revokeObjectURL(url);};
const exportWebsiteZip=async()=>{
    try{
      setMessage('Preparing website ZIP…');
      const orderedPages=[...pages].sort((a,b)=>a.page_order-b.page_order);
      if(!orderedPages.length)throw new Error('There are no pages to export.');
      const home=orderedPages.find(p=>p.is_homepage)||orderedPages[0],allFiles=[];
      const slugFor=p=>(p.slug||p.title||'page').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'')||'page';
      const pageLinks=orderedPages.map(p=>({id:p.id,title:p.title,href:p.id===home.id?'index.html':slugFor(p)+'.html'}));
      const css='*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:#172033;font-family:Inter,Arial,sans-serif;line-height:1.65}.site{width:min(1100px,calc(100% - 40px));margin:0 auto;padding:32px 0 64px}.site-title{font-size:clamp(1.4rem,4vw,2rem);margin:0 0 20px;color:#0b1730}.site-nav{display:flex;flex-wrap:wrap;gap:16px;margin:0 0 28px;padding:12px 0;border-bottom:1px solid #e5eaf1}.site-nav a{color:#24446f;text-decoration:none}.block{margin:0 0 22px;max-width:100%;overflow-wrap:anywhere}.block h1,.block h2,.block h3{line-height:1.2;margin:0 0 12px}.block p{margin:0 0 12px}.button{display:inline-block;padding:12px 22px;border-radius:7px;background:#123d83;color:#fff;text-decoration:none;font-weight:700}.button.secondary{background:#eaf1fb;color:#123d83}.image{display:block;max-width:100%;height:auto;border-radius:10px}.image-placeholder{padding:30px;background:#f2f5f9;color:#596579;border-radius:8px}.container{border-radius:10px;color:#273449}.columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.columns>div,.card{padding:22px;border:1px solid #e3e9f2;border-radius:10px}.card h3{margin:0 0 8px}.navbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 20px;border-bottom:1px solid #e5eaf1}.navbar nav{display:flex;flex-wrap:wrap;gap:16px}.navbar a{color:#24446f;text-decoration:none}.footer{margin-top:40px;padding:22px;background:#0b1730;color:#fff;border-radius:8px}.builder-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}.builder-table th,.builder-table td{border:1px solid #d5dde7;padding:10px;text-align:left}.builder-table th{background:#edf2f8;font-weight:700}.builder-table caption{padding:8px;font-weight:700;text-align:left}@media(max-width:640px){.site{width:calc(100% - 28px);padding-top:20px}.columns{grid-template-columns:1fr}.navbar{align-items:flex-start;flex-direction:column}.navbar nav{gap:10px}}';
      const js='// Apokolips Website Builder export\n// Add your own JavaScript below.\ndocument.addEventListener("DOMContentLoaded",()=>{document.querySelectorAll("a[href^=\\"#\\"]").forEach(link=>link.addEventListener("click",event=>{const target=document.querySelector(link.getAttribute("href"));if(target){event.preventDefault();target.scrollIntoView({behavior:"smooth"});}}));});\n';
      for(const currentPage of orderedPages){
        let pageBlocks;
        if(currentPage.id===pageId)pageBlocks=blocks;
        else{const result=await supabase.from('builder_page_components').select('id,page_id,component_type,properties,sort_order').eq('page_id',currentPage.id).order('sort_order');if(result.error)throw result.error;pageBlocks=result.data||[];}
        const nav=pageLinks.map(link=>'<a href="'+escapeHtml(link.href)+'">'+escapeHtml(link.title)+'</a>').join('');
        const pageJs=js+'\n'+pageBlocks.map(item=>item.properties?.customJS||'').filter(Boolean).join('\n');
        const html='<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>'+escapeHtml(currentPage.title||website.name)+'</title>\n<link rel="stylesheet" href="styles.css">\n</head>\n<body>\n<main class="site"><h1 class="site-title">'+escapeHtml(website.name||currentPage.title)+'</h1>\n<nav class="site-nav" aria-label="Main navigation">'+nav+'</nav>\n'+pageBlocks.map(makeExportMarkup).join('\n')+'\n</main>\n<script src="script.js" defer></script>\n</body>\n</html>';
        allFiles.push({name:currentPage.id===home.id?'index.html':slugFor(currentPage)+'.html',content:html});
      }
      allFiles.push({name:'styles.css',content:css},{name:'script.js',content:pageJs},{name:'README.txt',content:(website.name||'Website')+'\n\nExported from Apokolips Website Builder.\n\nThis ZIP contains every page in this website, plus shared styles.css and script.js.\nOpen index.html to view the homepage. Upload all files together to your web host.\n\nImages use their configured source URLs; download them separately for a fully offline copy.\n'});
      const blob=createZipBlob(allFiles),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=(website.slug||'website')+'.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
      setMessage('Website ZIP exported');
    }catch(exportError){setError(exportError.message||'Could not export website ZIP.');setMessage('Export failed');}
  };
  const applyJson=()=>{try{const parsed=JSON.parse(jsonText);if(!Array.isArray(parsed.components))throw new Error('JSON must contain a components array.');const next=parsed.components.map((x,i)=>{if(!TYPES.some(t=>t[0]===x.component_type))throw new Error('Unsupported component type: '+x.component_type);return{id:makeLocalId(),page_id:pageId,component_type:x.component_type,properties:x.properties||{},sort_order:i};});record(next);setSelected(next[0]?.id||'');setShowJson(false);}catch(e){setError('JSON not applied: '+e.message);}};
  const updatePageTitle=async(value)=>{
    setPages(p=>p.map(x=>x.id===pageId?{...x,title:value}:x));
    const {error:e}=await supabase.from('builder_website_pages').update({title:value}).eq('id',pageId);
    if(e)setError(e.message);
  };

  if(loading)return <div className="builder-loading">Opening visual editor…</div>;
  return <div className="builder-editor">
    <header className="builder-topbar">
      <button className="builder-back" onClick={onBack}>← Dashboard</button>
      <div className="builder-project-name"><b>{website.name}</b><span>www.sales.apokolips.xyz/{website.slug}</span></div>
      <div className="builder-top-actions"><span className={dirty?'save-status pending':'save-status'}>{saving?'Saving…':dirty?'Unsaved':'Saved'}</span><button onClick={()=>void save()} disabled={!dirty||saving}>Save</button><button onClick={()=>void togglePublish()} disabled={publishing||dirty||saving}>{publishing?'Please wait…':publishStatus==='published'?'Unpublish':'Publish'}</button><button onClick={exportJson}>Export layout</button><button onClick={exportWebsiteZip} disabled={!blocks.length}>Download ZIP</button></div>
    </header>
    <div className="builder-toolbar">
      <div className="builder-page-select"><label>PAGE</label><select value={pageId} onChange={e=>void switchPage(e.target.value)}>{pages.map(p=><option key={p.id} value={p.id}>{p.title}{p.is_homepage?' · Home':''}</option>)}</select><button onClick={()=>setShowPageForm(v=>!v)}>＋ Page</button></div>
      <div className="builder-device"><button className={device==='desktop'?'active':''} onClick={()=>setDevice('desktop')}>Desktop</button><button className={device==='tablet'?'active':''} onClick={()=>setDevice('tablet')}>Tablet</button><button className={device==='mobile'?'active':''} onClick={()=>setDevice('mobile')}>Mobile</button></div>
      <div className="builder-history"><button onClick={undo} disabled={!history.length}>↶ Undo</button><button onClick={redo} disabled={!future.length}>↷ Redo</button></div>
    </div>
    {showPageForm&&<form className="builder-page-form" onSubmit={addPage}><input value={pageName} onChange={e=>setPageName(e.target.value)} placeholder="New page name" maxLength={100} required/><button type="submit">Create page</button><button type="button" onClick={()=>setShowPageForm(false)}>Cancel</button></form>}
    {error&&<div className="builder-error" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
    {publishNotice&&<div className="builder-publish-notice" role="status">{publishNotice}{publishStatus==='published'&&<a href={'https://www.sales.apokolips.xyz/'+website.slug} target="_blank" rel="noreferrer">Open published website</a>}</div>}
    <div className="builder-workspace">
      <aside className="builder-palette"><div className="builder-panel-title">ADD ELEMENTS</div>{TYPES.map(([type,label,icon])=><button key={type} draggable onDragStart={e=>e.dataTransfer.setData('builder-component-type',type)} onClick={()=>addBlock(type)}><span>{icon}</span>{label}<b>＋</b></button>)}<details className="html-tag-library"><summary>HTML TAG LIBRARY · {HTML_TAGS.length}</summary><div>{HTML_TAGS.map(tag=><button key={tag} draggable onDragStart={e=>e.dataTransfer.setData('builder-html-tag',tag)} onClick={()=>addBlock('html',{tag})}>&lt;{tag}&gt;</button>)}</div></details></aside>
      <section className="builder-canvas-area"><div className="canvas-heading"><span>PAGE CANVAS</span><small>Drag blocks to reorder · Select to edit</small></div>
        <div className={'builder-canvas '+device}>
          <div className="canvas-site-head"><b>{website.name}</b><span>{page?.title||'Home'}</span></div>
          {blocks.length?blocks.map((b)=><div key={b.id} draggable onDragStart={()=>dragStart(b.id)} onDragOver={e=>e.preventDefault()} onDrop={e=>dropOn(b.id,e)}>{renderBlock(b,b.id===selected,setSelected,false,startResize)}<div className="canvas-reorder"><button onClick={()=>move(b.id,-1)}>↑</button><button onClick={()=>move(b.id,1)}>↓</button></div></div>):<div className="canvas-empty"><b>Start building this page</b><p>Choose an element from the left panel to add it to your canvas.</p></div>}
          <div className="canvas-end">End of page</div>
        </div>
      </section>
      <aside className="builder-inspector"><div className="inspector-tabs"><button className={tab==='properties'?'active':''} onClick={()=>setTab('properties')}>Properties</button><button className={tab==='layers'?'active':''} onClick={()=>setTab('layers')}>Layers</button></div>
        {tab==='layers'?<div className="layer-list">{blocks.map((b,i)=><button key={b.id} className={selected===b.id?'active':''} onClick={()=>setSelected(b.id)}><span>{TYPES.find(t=>t[0]===b.component_type)?.[1]}</span><small>{i+1}</small></button>)}</div>:selectedBlock?<div className="property-form"><div className="property-heading"><b>{TYPES.find(t=>t[0]===selectedBlock.component_type)?.[1]}</b><button onClick={removeSelected}>Delete</button></div>
          <div className="dimension-controls"><b>SIZE</b><label>Width (px)<input type="number" min="80" value={selectedBlock.properties?._width??''} placeholder="Auto" onChange={e=>updateProp('_width',e.target.value===''?undefined:Math.max(80,Number(e.target.value)))}/></label><label>Height (px)<input type="number" min="40" value={selectedBlock.properties?._height??''} placeholder="Auto" onChange={e=>updateProp('_height',e.target.value===''?undefined:Math.max(40,Number(e.target.value)))}/></label><small>Drag the blue corner on the selected element to resize visually.</small></div>
          {Object.entries(selectedBlock.properties||{}).filter(([key])=>!['attributes','styles','rows','customCSS','customJS','_width','_height'].includes(key)).map(([key,value])=><label key={key}>{key==='tag'?'HTML tag':key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}{key==='tag'?<select value={value} onChange={e=>updateProp(key,e.target.value)}>{HTML_TAGS.map(tag=><option key={tag} value={tag}>&lt;{tag}&gt;</option>)}</select>:typeof value==='number'?<input type="number" value={value} onChange={e=>updateProp(key,Number(e.target.value))}/>:key==='color'||key==='background'?<input type="color" value={/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff'} onChange={e=>updateProp(key,e.target.value)}/>:<textarea rows={key==='text'||key==='content'?4:2} value={String(value??'')} onChange={e=>updateProp(key,e.target.value)}/>}</label>)}
          {selectedBlock.component_type==='html'&&<div className="advanced-element-tools"><label>HTML attributes (JSON)<textarea key={selectedBlock.id+'-attrs'} defaultValue={selectedBlock.properties.attributes||'{}'} rows={5} onBlur={e=>{try{const v=JSON.parse(e.target.value);if(!v||Array.isArray(v)||typeof v!=='object')throw new Error('Attributes must be a JSON object.');updateProp('attributes',JSON.stringify(v));}catch(err){setError(err.message);}}}/></label><label>CSS styles (JSON)<textarea key={selectedBlock.id+'-styles'} defaultValue={selectedBlock.properties.styles||'{}'} rows={5} onBlur={e=>{try{const v=JSON.parse(e.target.value);if(!v||Array.isArray(v)||typeof v!=='object')throw new Error('Styles must be a JSON object.');updateProp('styles',JSON.stringify(v));}catch(err){setError(err.message);}}}/></label><label>Custom CSS<textarea key={selectedBlock.id+'-css'} defaultValue={selectedBlock.properties.customCSS||''} rows={5} onBlur={e=>updateProp('customCSS',e.target.value)}/></label><label>Custom JavaScript (exported to script.js)<textarea key={selectedBlock.id+'-js'} defaultValue={selectedBlock.properties.customJS||''} rows={7} onBlur={e=>updateProp('customJS',e.target.value)}/></label></div>}
          {selectedBlock.component_type==='table'&&<div className="advanced-element-tools"><label>Table attributes (JSON)<textarea key={selectedBlock.id+'-ta'} defaultValue={selectedBlock.properties.tableAttributes||'{}'} rows={3} onBlur={e=>{try{const v=JSON.parse(e.target.value);if(!v||Array.isArray(v)||typeof v!=='object')throw new Error('Use a JSON object.');updateProp('tableAttributes',JSON.stringify(v));}catch(err){setError(err.message);}}}/></label><label>Header cell attributes (JSON)<textarea key={selectedBlock.id+'-ha'} defaultValue={selectedBlock.properties.headerAttributes||'{}'} rows={3} onBlur={e=>{try{const v=JSON.parse(e.target.value);if(!v||Array.isArray(v)||typeof v!=='object')throw new Error('Use a JSON object.');updateProp('headerAttributes',JSON.stringify(v));}catch(err){setError(err.message);}}}/></label><label>Data cell attributes (JSON)<textarea key={selectedBlock.id+'-ca'} defaultValue={selectedBlock.properties.cellAttributes||'{}'} rows={3} onBlur={e=>{try{const v=JSON.parse(e.target.value);if(!v||Array.isArray(v)||typeof v!=='object')throw new Error('Use a JSON object.');updateProp('cellAttributes',JSON.stringify(v));}catch(err){setError(err.message);}}}/></label><label>Table rows (JSON array of arrays)<textarea key={selectedBlock.id+'-rows'} defaultValue={selectedBlock.properties.rows||'[]'} rows={8} onBlur={e=>{try{const v=JSON.parse(e.target.value);if(!Array.isArray(v)||v.some(row=>!Array.isArray(row)))throw new Error('Rows must be an array of arrays.');updateProp('rows',JSON.stringify(v));}catch(err){setError(err.message);}}}/></label></div>}
          <button className="json-toggle" onClick={()=>{setJsonText(JSON.stringify(selectedBlock.properties,null,2));setShowJson(v=>!v);}}>Advanced properties JSON</button>
          {showJson&&<div className="json-editor"><textarea value={jsonText} onChange={e=>setJsonText(e.target.value)} rows={9}/><button onClick={()=>{try{const props=JSON.parse(jsonText);if(!props||Array.isArray(props)||typeof props!=='object')throw new Error('Use a JSON object.');record(blocks.map(b=>b.id===selected?{...b,properties:props}:b));setShowJson(false);}catch(e){setError(e.message);}}}>Apply JSON</button></div>}
        </div>:<div className="inspector-empty">Select an element on the canvas or add one from the left panel.</div>}
      </aside>
    </div>
    <footer className="builder-footer"><span>{message}</span><span>{publishStatus==='published'?'Published · Public website enabled':'Draft · Not visible to visitors'}</span></footer>
  </div>;
}
