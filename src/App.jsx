import { useEffect, useMemo, useState } from 'react';
const ICON='./file_00000000a7ec820890154ca6ed49b608.ico';
const VISITOR_KEY='apokolips_xyz_homepage_visitors_2026';
const VISITOR_API='https://countapi.mileshilliard.com/api/v1';

function RainCanvas(){
 useEffect(()=>{const canvas=document.getElementById('rain');if(!canvas)return;const ctx=canvas.getContext('2d');let w=0,h=0,drops=[],frame=0;
 function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);drops=Array.from({length:Math.max(35,Math.min(90,Math.floor(w/10)))},()=>({x:Math.random()*w,y:Math.random()*h,len:3+Math.random()*5,speed:.8+Math.random()*1.7,opacity:.25+Math.random()*.4,travel:0,limit:90+Math.random()*180}));}
 function animate(){ctx.clearRect(0,0,w,h);drops.forEach(d=>{ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-.5,d.y+d.len);ctx.strokeStyle='rgba(170,205,255,'+d.opacity+')';ctx.lineWidth=1.2;ctx.stroke();d.y+=d.speed;d.travel+=d.speed;if(d.travel>=d.limit||d.y>h+10){d.x=Math.random()*w;d.y=-Math.random()*35;d.travel=0;d.limit=90+Math.random()*180;}});frame=requestAnimationFrame(animate);}
 resize();addEventListener('resize',resize,{passive:true});if(!matchMedia('(prefers-reduced-motion: reduce)').matches)animate();return()=>{cancelAnimationFrame(frame);removeEventListener('resize',resize);};},[]);
 return <canvas id="rain" aria-hidden="true"/>;
}
function VisitorCounter(){
 const[count,setCount]=useState('128');
 useEffect(()=>{let active=true;async function request(action){const r=await fetch(VISITOR_API+'/'+action+'/'+VISITOR_KEY,{cache:'no-store'});const d=await r.json();if(!r.ok){const e=new Error(d.error||'Visitor counter request failed');e.status=r.status;throw e;}return d;}
 async function update(){let counted=false;try{counted=sessionStorage.getItem('apokolips_home_visit_counted')==='1';}catch(_){}try{if(!counted){try{await request('get');}catch(e){if(e.status!==404)throw e;const r=await fetch(VISITOR_API+'/set/'+VISITOR_KEY+'?value=128',{cache:'no-store'});if(!r.ok)throw new Error('Could not initialize visitor counter');}const result=await request('hit');try{sessionStorage.setItem('apokolips_home_visit_counted','1');}catch(_){}if(active)setCount(Number(result.value).toLocaleString());}else{const result=await request('get');if(active)setCount(Number(result.value).toLocaleString());}}catch(e){console.error('Apokolips visitor counter:',e);if(active)setCount('—');}}
 update();return()=>{active=false;};},[]);
 return <span className="visitor-counter" aria-label="Apokolips visitor count"><span>VISITORS</span><strong>{count}</strong></span>;
}
const links=[['Home','index.html'],['About Me','info.html'],['Community Gallery','project.gallery.html'],['My Projects','My-project.html'],['Code Editor','editor.html'],['Subdomain Plans','plans.html']];
const cards=[
 {number:'01 / PROFILE',icon:'◈',title:'About Me',description:'Personal details, contact information, interests, and ideas.',href:'info.html',action:'VIEW PROFILE ↗'},
 {number:'02 / WORK',icon:'⌘',title:'My Projects',description:'A growing collection of applications, concepts, and experiments.',href:'My-project.html',action:'OPEN PROJECT HUB ↗'},
 {number:'03 / CREATE',icon:'⌘',title:'Code Editor',description:'Write code with smart suggestions and run web projects in a live preview.',href:'editor.html',action:'START CODING ↗'},
 {number:'04 / COMMUNITY',icon:'✧',title:'Community Gallery',description:'Explore creative work and contributions from the community.',href:'project.gallery.html',action:'EXPLORE GALLERY ↗'},
 {number:'05 / SERVICES',icon:'◇',title:'Subdomain Plans',description:'Explore Apokolips packages and submit an application by email.',href:'plans.html',action:'VIEW PLANS ↗'}
];
function CommandPalette({open,onClose,onCopy}){
 const[query,setQuery]=useState('');
 const results=useMemo(()=>[...links.map(([label,href])=>({label,href,detail:'Open page'})),{label:'Copy website link',action:onCopy,detail:'Share this homepage'}].filter(item=>item.label.toLowerCase().includes(query.toLowerCase())),[query,onCopy]);
 useEffect(()=>{if(open){setQuery('');requestAnimationFrame(()=>document.getElementById('command-search')?.focus());}},[open]);
 if(!open)return null;
 return <div className="command-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="command-panel" role="dialog" aria-modal="true" aria-labelledby="command-title"><div className="command-heading"><span id="command-title">QUICK LAUNCH</span><kbd>ESC</kbd></div><input id="command-search" className="command-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search pages and actions..."/><div className="command-results">{results.length?results.map(item=><a key={item.label} href={item.href||'#'} onClick={e=>{if(item.action){e.preventDefault();item.action();}onClose();}}><span><strong>{item.label}</strong><small>{item.detail}</small></span><b>↗</b></a>):<p className="command-empty">No matching actions found.</p>}</div><div className="command-foot">Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to open quick launch</div></section></div>;
}
export default function App(){
 const[menuOpen,setMenuOpen]=useState(false),[paletteOpen,setPaletteOpen]=useState(false),[showTop,setShowTop]=useState(false),[progress,setProgress]=useState(0),[toast,setToast]=useState('');
 const year=new Date().getFullYear();
 const copyLink=async()=>{try{await navigator.clipboard.writeText(window.location.href);setToast('Website link copied');}catch(_){setToast('Copy is not available in this browser');}};
 useEffect(()=>{const onScroll=()=>{const max=document.documentElement.scrollHeight-innerHeight;setProgress(max>0?Math.min(100,scrollY/max*100):0);setShowTop(scrollY>420);};const onKey=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPaletteOpen(v=>!v);}if(e.key==='Escape')setPaletteOpen(false);};addEventListener('scroll',onScroll,{passive:true});addEventListener('keydown',onKey);onScroll();return()=>{removeEventListener('scroll',onScroll);removeEventListener('keydown',onKey);};},[]);
 useEffect(()=>{const nodes=document.querySelectorAll('.reveal-on-scroll');if(!('IntersectionObserver'in window)){nodes.forEach(n=>n.classList.add('is-visible'));return;}const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});nodes.forEach(n=>observer.observe(n));return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(id);},[toast]);
 return <><div className="scroll-progress" style={{transform:'scaleX('+progress/100+')'}} aria-hidden="true"/><RainCanvas/>
 <header className="topbar"><a className="brand" href="index.html"><span className="brand-mark"><img src={ICON} alt="Apokolips logo"/></span><span>APOKOLIPS</span></a><div className="topbar-actions"><button className="launch-button" type="button" onClick={()=>setPaletteOpen(true)}><span>⌕</span> Quick launch <kbd>Ctrl K</kbd></button><button className="menu-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>☰</button></div><nav className={'nav'+(menuOpen?' open':'')} aria-label="Main navigation">{links.map(([label,href],i)=><a key={href} className={i===0?'active':''} href={href} onClick={()=>setMenuOpen(false)}>{label}</a>)}</nav></header>
 <main className="hero-wrap"><div className="eyebrow"><span className="status-dot"/> PERSONAL PORTFOLIO &amp; PROJECT HUB</div><h1>Ideas become<br/><span className="gradient-text">something real.</span></h1><p className="hero-copy">Welcome to my personal space — a place to explore who I am, discover my ideas, view my projects, and explore my work.</p><div className="hero-actions"><a className="btn btn-primary" href="My-project.html">Explore Projects <span>↗</span></a><a className="btn btn-ghost" href="editor.html">Open Code Editor <span>↗</span></a><a className="btn btn-ghost" href="project.gallery.html">Community Gallery <span>↗</span></a><button className="btn btn-ghost" type="button" onClick={copyLink}>Copy website link <span>⧉</span></button></div><div className="hero-meta"><span>BASED IN SRI LANKA</span><span className="meta-line"/><span>LEARNING · BUILDING · CREATING</span></div></main>
 <section className="quick-grid" aria-label="Explore Apokolips">{cards.map((card,i)=><a className="quick-card reveal-on-scroll" href={card.href} key={card.href} style={{'--reveal-delay':(i*90)+'ms'}}><span className="card-index">{card.number}</span><span className="card-icon">{card.icon}</span><h2>{card.title}</h2><p>{card.description}</p><span className="card-link">{card.action}</span></a>)}</section>
 <footer className="footer"><span>© {year} Lakindu Sathsara</span><span>BUILT WITH CURIOSITY <span className="accent">●</span></span><VisitorCounter/></footer>
 <button className={'back-to-top'+(showTop?' visible':'')} type="button" aria-label="Back to top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>↑</button>
 <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} onCopy={copyLink}/><div className={'toast-message'+(toast?' visible':'')} role="status" aria-live="polite">{toast}</div></>;
}
