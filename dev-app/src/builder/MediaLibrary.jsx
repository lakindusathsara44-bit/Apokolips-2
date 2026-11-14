import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
const BUCKET='apokolips-media';
const MAX_FILE_SIZE=100*1024*1024;
const ACCEPTED=new Set('jpg jpeg png webp gif avif mp4 webm ogv ogg mov avi mkv mp3 m4a wav flac aac pdf doc docx odt txt rtf csv xls xlsx ods ppt pptx zip'.split(' '));
const formatSize=bytes=>bytes<1024*1024?(bytes/1024).toFixed(1)+' KB':(bytes/1024/1024).toFixed(1)+' MB';
const safeName=name=>String(name||'upload').normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(-110)||'upload';
export default function MediaLibrary({websiteId,onSelect,onClose}){
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[uploading,setUploading]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[filter,setFilter]=useState('all'),[search,setSearch]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    const {data,error:loadError}=await supabase.storage.from(BUCKET).list(websiteId,{limit:100,sortBy:{column:'created_at',order:'desc'}});
    if(loadError){setError(loadError.message);setItems([]);setLoading(false);return;}
    setItems((data||[]).filter(item=>item.id).map(item=>{
      const path=websiteId+'/'+item.name,{data:publicData}=supabase.storage.from(BUCKET).getPublicUrl(path);
      return {id:item.id,name:item.name,path,url:publicData.publicUrl,mimeType:item.metadata?.mimetype||'',size:item.metadata?.size||0};
    }));
    setLoading(false);
  },[websiteId]);
  useEffect(()=>{void load();},[load]);
  const upload=async event=>{
    const files=Array.from(event.target.files||[]);event.target.value='';if(!files.length)return;
    setUploading(true);setError('');
    try{
      for(let i=0;i<files.length;i++){
        const file=files[i],extension=(file.name.split('.').pop()||'').toLowerCase();
        if(file.size>MAX_FILE_SIZE)throw new Error(file.name+' exceeds the 100 MB limit.');
        if(!ACCEPTED.has(extension))throw new Error(file.name+' is not a supported file format.');
        const path=websiteId+'/'+Date.now()+'-'+i+'-'+safeName(file.name);
        setProgress('Uploading '+(i+1)+' of '+files.length+': '+file.name);
        const {error:uploadError}=await supabase.storage.from(BUCKET).upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type||undefined});
        if(uploadError)throw uploadError;
      }
      await load();setProgress('Upload complete');
    }catch(uploadError){setError(uploadError.message||'Upload failed.');}
    finally{setUploading(false);}
  };
  const remove=async item=>{
    if(!window.confirm('Delete "'+item.name+'" from this website media library?'))return;
    const {error:removeError}=await supabase.storage.from(BUCKET).remove([item.path]);
    if(removeError){setError(removeError.message);return;}
    setItems(current=>current.filter(file=>file.path!==item.path));
  };
  const filtered=useMemo(()=>items.filter(item=>{
    const type=item.mimeType.toLowerCase(),category=type.startsWith('image/')?'images':type.startsWith('video/')?'video':type.startsWith('audio/')?'audio':'documents';
    return (filter==='all'||category===filter)&&item.name.toLowerCase().includes(search.toLowerCase());
  }),[items,filter,search]);
  return <div className="media-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="media-modal" role="dialog" aria-modal="true" aria-labelledby="media-library-title">
      <header className="media-modal-header"><div><span>APOKOLIPS BUILDER</span><h2 id="media-library-title">Media library</h2><p>Upload and reuse files for this website.</p></div><button type="button" onClick={onClose} aria-label="Close media library">×</button></header>
      <div className="media-upload-row"><label className="media-upload-button">＋ Upload files<input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.ogv,.ogg,.mov,.avi,.mkv,.mp3,.m4a,.wav,.flac,.aac,.pdf,.doc,.docx,.odt,.txt,.rtf,.csv,.xls,.xlsx,.ods,.ppt,.pptx,.zip" onChange={upload} disabled={uploading}/></label><small>Images · Video · Audio · Documents · ZIP · Max 100 MB per file</small></div>
      {progress&&<p className="media-progress" role="status">{progress}</p>}{error&&<p className="media-error" role="alert">{error}</p>}
      <div className="media-filter-row"><input aria-label="Search media" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search files…"/><div>{['all','images','video','audio','documents'].map(value=><button type="button" key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{value==='all'?'All':value[0].toUpperCase()+value.slice(1)}</button>)}</div></div>
      <div className="media-grid">{loading?<p className="media-empty">Loading media…</p>:filtered.length?filtered.map(item=><article className="media-item" key={item.path}>
        <div className="media-preview">{item.mimeType.startsWith('image/')?<img src={item.url} alt={item.name}/>:<span>{item.mimeType.startsWith('video/')?'VIDEO':item.mimeType.startsWith('audio/')?'AUDIO':'FILE'}</span>}</div>
        <div className="media-item-info"><b title={item.name}>{item.name}</b><small>{formatSize(Number(item.size)||0)} · {item.mimeType||'File'}</small></div>
        <div className="media-item-actions"><button type="button" onClick={()=>onSelect(item)}>Use file</button><a href={item.url} target="_blank" rel="noreferrer">Open</a><button type="button" className="media-delete" onClick={()=>void remove(item)}>Delete</button></div>
      </article>):<p className="media-empty">{search?'No matching files.':'No media uploaded yet. Upload your first file above.'}</p>}</div>
      <footer className="media-modal-footer"><span>{items.length} file{items.length===1?'':'s'} stored for this website</span><button type="button" onClick={()=>void load()} disabled={loading||uploading}>Refresh</button></footer>
    </section>
  </div>;
}
