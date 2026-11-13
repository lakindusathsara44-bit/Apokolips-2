import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const TYPES = [
  ['heading','Heading','Aa'],['text','Text','¶'],['button','Button','▰'],
  ['image','Image','▧'],['container','Container','▱'],['columns','Columns','▥'],
  ['card','Card','▣'],['navbar','Navigation','☰'],['footer','Footer','⌄']
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
  footer:{text:'© Your brand. All rights reserved.'}
};
const clone = value => JSON.parse(JSON.stringify(value));
const makeLocalId = () => 'local-' + Math.random().toString(36).slice(2,11);

function renderBlock(item, selected, onSelect, preview) {
  const p=item.properties||{};
  const common={onClick:()=>!preview&&onSelect(item.id),className:(preview?'preview-block':'canvas-block')+(selected&&!preview?' selected':'')};
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
  const addBlock=(type)=>{
    const item={id:makeLocalId(),page_id:pageId,component_type:type,properties:clone(defaults[type]),sort_order:blocks.length};
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
  function dropOn(id){
    const from=blocks.findIndex(b=>b.id===dragId.current),to=blocks.findIndex(b=>b.id===id);
    if(from<0||to<0||from===to)return;
    const next=[...blocks];const [item]=next.splice(from,1);next.splice(to,0,item);record(next.map((b,i)=>({...b,sort_order:i})));dragId.current=null;
  }
  const exportJson=()=>{const blob=new Blob([JSON.stringify({website:website.name,page:page?.title,components:blocks.map(({component_type,properties,sort_order})=>({component_type,properties,sort_order}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(page?.slug||'page')+'-layout.json';a.click();URL.revokeObjectURL(url);};
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
      <div className="builder-top-actions"><span className={dirty?'save-status pending':'save-status'}>{saving?'Saving…':dirty?'Unsaved':'Saved'}</span><button onClick={()=>void save()} disabled={!dirty||saving}>Save</button><button onClick={()=>void togglePublish()} disabled={publishing||dirty||saving}>{publishing?'Please wait…':publishStatus==='published'?'Unpublish':'Publish'}</button><button onClick={exportJson}>Export layout</button></div>
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
      <aside className="builder-palette"><div className="builder-panel-title">ADD ELEMENTS</div>{TYPES.map(([type,label,icon])=><button key={type} onClick={()=>addBlock(type)}><span>{icon}</span>{label}<b>＋</b></button>)}</aside>
      <section className="builder-canvas-area"><div className="canvas-heading"><span>PAGE CANVAS</span><small>Drag blocks to reorder · Select to edit</small></div>
        <div className={'builder-canvas '+device}>
          <div className="canvas-site-head"><b>{website.name}</b><span>{page?.title||'Home'}</span></div>
          {blocks.length?blocks.map((b)=><div key={b.id} draggable onDragStart={()=>dragStart(b.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>dropOn(b.id)}>{renderBlock(b,b.id===selected,setSelected,false)}<div className="canvas-reorder"><button onClick={()=>move(b.id,-1)}>↑</button><button onClick={()=>move(b.id,1)}>↓</button></div></div>):<div className="canvas-empty"><b>Start building this page</b><p>Choose an element from the left panel to add it to your canvas.</p></div>}
          <div className="canvas-end">End of page</div>
        </div>
      </section>
      <aside className="builder-inspector"><div className="inspector-tabs"><button className={tab==='properties'?'active':''} onClick={()=>setTab('properties')}>Properties</button><button className={tab==='layers'?'active':''} onClick={()=>setTab('layers')}>Layers</button></div>
        {tab==='layers'?<div className="layer-list">{blocks.map((b,i)=><button key={b.id} className={selected===b.id?'active':''} onClick={()=>setSelected(b.id)}><span>{TYPES.find(t=>t[0]===b.component_type)?.[1]}</span><small>{i+1}</small></button>)}</div>:selectedBlock?<div className="property-form"><div className="property-heading"><b>{TYPES.find(t=>t[0]===selectedBlock.component_type)?.[1]}</b><button onClick={removeSelected}>Delete</button></div>
          {Object.entries(selectedBlock.properties||{}).map(([key,value])=><label key={key}>{key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase())}{typeof value==='number'?<input type="number" value={value} onChange={e=>updateProp(key,Number(e.target.value))}/>:key==='color'||key==='background'?<input type="color" value={/^#[0-9a-f]{6}$/i.test(value)?value:'#ffffff'} onChange={e=>updateProp(key,e.target.value)}/>:<textarea rows={key==='text'?4:2} value={String(value??'')} onChange={e=>updateProp(key,e.target.value)}/>}</label>)}
          <button className="json-toggle" onClick={()=>{setJsonText(JSON.stringify(selectedBlock.properties,null,2));setShowJson(v=>!v);}}>Advanced properties JSON</button>
          {showJson&&<div className="json-editor"><textarea value={jsonText} onChange={e=>setJsonText(e.target.value)} rows={9}/><button onClick={()=>{try{const props=JSON.parse(jsonText);if(!props||Array.isArray(props)||typeof props!=='object')throw new Error('Use a JSON object.');record(blocks.map(b=>b.id===selected?{...b,properties:props}:b));setShowJson(false);}catch(e){setError(e.message);}}}>Apply JSON</button></div>}
        </div>:<div className="inspector-empty">Select an element on the canvas or add one from the left panel.</div>}
      </aside>
    </div>
    <footer className="builder-footer"><span>{message}</span><span>{publishStatus==='published'?'Published · Public website enabled':'Draft · Not visible to visitors'}</span></footer>
  </div>;
}
