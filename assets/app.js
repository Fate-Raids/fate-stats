'use strict';
const { assemble, unwrapImports, rollSummary } = window.PlusOneParser;

const $=selector=>document.querySelector(selector);
const main=$('#main');
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=s=>escapeHTML(s);
const num=n=>Number(n||0).toLocaleString();
const dateFmt=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'});
const timeFmt=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'});
const fmtDate=v=>v?dateFmt.format(new Date(v)):'Unknown date';
const fmtTime=v=>v?timeFmt.format(new Date(v)):'';
const state={view:'overview',search:'',session:'all',mode:'all',raider:'all',published:[],local:[],data:assemble([]),ready:false};
const viewNames={overview:'Overview',sessions:'Raid sessions',loot:'Loot history',players:'Raiders',gear:'Raid gear',rolls:'Roll analytics',statistics:'Statistics'};
const qualityClass=q=>Number.isInteger(q)&&q>=0&&q<=7?`quality-${q}`:'';
const qFrame=q=>Number.isInteger(q)&&q>=0&&q<=7?`q${q}`:'';
const classMode=m=>m==='Main Spec'?'main':m==='Off Spec'?'off':m==='Transmog'?'transmog':'';
const safeSlug=v=>{const n=String(v||'').replace(/\\/g,'/').split('/').pop().replace(/\.(?:jpg|png|webp|blp|tga|jpeg)$/i,'').toLowerCase();return /[a-z]/.test(n)&&/^[a-z0-9_]+$/.test(n)?n:'';};
// Forever is its own Wowhead database. Never resolve item IDs in Classic/Retail.
const FOREVER_DB='https://www.wowhead.com/forever';
const validItemId=item=>Number.isSafeInteger(Number(item?.id))&&Number(item?.id)>0?Number(item.id):null;
const foreverItemURL=item=>{const id=validItemId(item);return id?`${FOREVER_DB}/item=${id}`:'';};
const foreverTooltipAttr=item=>{const id=validItemId(item);return id?`data-wowhead="item=${id}&amp;domain=forever"`:'';};
// Always render a visible item graphic. Actual textures require an exported icon
// name/path; unverified item IDs must never be mapped to an unrelated texture.
function iconFallback(item,slotLabel=''){
  const text=(String(slotLabel)+' '+String(item?.name||'')).toLowerCase();
  let kind='misc';
  if(/head|helm|circlet|chapeau|hood|hat|crown/.test(text))kind='head';
  else if(/chest|armor|robe|overshirt|tunic|vest/.test(text))kind='chest';
  else if(/main hand|off hand|sword|barb|dagger|blade|staff|hammer|reaver|mace|axe|weapon|rod|might/.test(text))kind='weapon';
  else if(/shield|aegis|guard|offhand/.test(text))kind='shield';
  else if(/ring|finger|band|seal/.test(text))kind='ring';
  else if(/neck|amulet|pendant|locket/.test(text))kind='neck';
  else if(/feet|boot|slipper/.test(text))kind='feet';
  else if(/glove|hands|gauntlet/.test(text))kind='hands';
  else if(/trinket|watch|carrot|charm|orb/.test(text))kind='trinket';
  else if(/cloak|back|cape|shawl/.test(text))kind='back';
  else if(/bow|rifle|gun|ranged|relic|harpoon/.test(text))kind='ranged';
  else if(/shoulder|mantle/.test(text))kind='shoulder';
  else if(/waist|belt/.test(text))kind='waist';
  else if(/legs|leggings|pants/.test(text))kind='legs';
  else if(/wrist|bracers/.test(text))kind='wrist';
  else if(/shirt|tabard/.test(text))kind='shirt';
  const shapes={
    head:'M5 8l3-4 4 3 4-3 3 4-1 10H6z M8 12h8',
    chest:'M7 4l5 3 5-3 4 5-4 3v8H7v-8L3 9z',
    weapon:'M4 20L19 5 M13 5l6 0 0 6 M5 16l3 3 M3 19l2 2',
    shield:'M12 3l8 3v6c0 5-4 7-8 9-4-2-8-4-8-9V6z M12 7v10',
    ring:'M8 5l4-2 4 2 1 5-5 3-5-3z M7 12a5 5 0 1010 0',
    neck:'M4 4v4a8 8 0 0016 0V4 M10 17l2 4 2-4-2-3z',
    feet:'M8 3v9l-4 5v3h16v-5l-8-1-2-5V3z',
    hands:'M7 11V5a1 1 0 012 0v6V3a1 1 0 012 0v8V4a1 1 0 012 0v7V6a1 1 0 012 0v9l-4 6H9l-5-7 2-2z',
    trinket:'M12 3l8 9-8 9-8-9z M12 8l3 4-3 4-3-4z',
    back:'M7 3h10l3 18-8-4-8 4z M9 6h6',
    ranged:'M5 5c13 0 13 14 0 14 M18 4v16 M3 12h15',
    shoulder:'M5 8l7-4 7 4v6l-7 6-7-6z M9 11h6',
    waist:'M3 8h18v8H3z M10 9v6h5V9z',
    legs:'M7 3h10l1 18h-5l-1-11-1 11H6z',
    wrist:'M5 6l14 0v12H5z M8 9h8v6H8z',
    shirt:'M7 4l5 3 5-3 4 5-4 3v8H7v-8L3 9z',
    misc:'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z'
  };
  return `<svg class="item-placeholder" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><path d="${shapes[kind]}"/></svg>`;
}
function icon(item,small=false,slotLabel='',plain=false){
  const slug=safeSlug(item?.icon);
  const shape=iconFallback(item,slotLabel);
  const image=slug?`<img loading="lazy" src="https://wow.zamimg.com/images/wow/icons/${small?'medium':'large'}/${slug}.jpg" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">${`<span class="local-icon-fallback" style="display:none">${shape}</span>`}`:'';
  const content=image||shape;
  const label=slug?'Item icon from exported texture':'Illustrative equipment symbol; actual item texture not included in JSON';
  const url=foreverItemURL(item);
  const inner=plain||!url?content:`<a class="item-icon-link" href="${url}" target="_blank" rel="noopener noreferrer" ${foreverTooltipAttr(item)} data-wh-icon-size="small" aria-label="View ${safe(item?.name||'item')} on Wowhead Forever">${content}</a>`;
  return `<span class="item-frame ${qFrame(item?.quality)}" title="${label}">${inner}</span>`;
}

function itemName(item){
  const name=safe(item?.name||'Unknown item'),q=qualityClass(item?.quality);
  const url=foreverItemURL(item);
  if(url){
    // The exported name and quality remain authoritative; do not let Wowhead
    // overwrite them if its public Forever database has not discovered an item.
    return `<a class="item-link ${q}" href="${url}" target="_blank" rel="noopener noreferrer" ${foreverTooltipAttr(item)} title="${name} — view on Wowhead Forever">${name}</a>`;
  }
  return `<span class="${q}">${name}</span>`;
}
function modeTag(m){return `<span class="tag ${classMode(m)}">${safe(m)}</span>`;}
const jsonURL='data/archive.json';
function allSources(){return [...state.published,...state.local];}
function refreshData(){state.data=assemble(allSources());render();}
function setStatus(){ $('#data-flag').textContent=state.local.length?'LOCAL PREVIEW · NOT PUBLISHED':state.published.length?'PUBLISHED ARCHIVE':'NO PUBLISHED DATA';const clear=$('#preview-clear');if(clear)clear.hidden=!state.local.length; }
function toast(message,error=false){
  const el=document.createElement('div');el.className=`toast${error?' error':''}`;el.textContent=message;$('#toast-area').append(el);
  setTimeout(()=>el.remove(),6500);
}
async function fetchJson(path){const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}: ${path}`);return r.json();}
async function init(){
  state.ready=true;refreshData();
  const startup=$('#startup-status');if(startup)startup.hidden=true;
  if(location.protocol==='file:') toast('Open the website through GitHub Pages or another local web server to load published sessions.',true);
  try{const raw=await fetchJson(jsonURL);state.published=unwrapImports(raw,'archive.json');}
  catch(e){console.warn('Archive not available:',e.message);toast('Could not load published raid history. Please check the latest GitHub Actions deployment.',true);}
  refreshData();processHash();
}
const metric=(label,value,foot,art)=>`<section class="metric"><div class="metric-label">${safe(label)}</div><div class="metric-art">${art}</div><div class="metric-number">${num(value)}</div><div class="metric-foot">${safe(foot)}</div></section>`;
function stats(){
  const {sessions,entries,players}=state.data;
  return `<div class="metrics">${metric('RAID SESSIONS',sessions.length,'Archived raid nights','▤')}${metric('ITEMS AWARDED',entries.length,'Logged loot distributions','◆')}${metric('UNIQUE RAIDERS',players.length,'Players across all sessions','♙')}${metric('GEAR SNAPSHOTS',sessions.reduce((n,s)=>n+s.members.filter(m=>m.gear).length,0),'Captured at scan time','♜')}${metric('SOFT RESERVES',sessions.reduce((n,s)=>n+s.softRes.length,0),'Historical snapshots','✧')}</div>`;
}
function header(title,subtitle){
  return `<div class="hero"><div><div class="eyebrow">RAID INTELLIGENCE / ${safe(viewNames[state.view]).toUpperCase()}</div><h1>${safe(title)}</h1><p>${safe(subtitle)}</p></div><div class="hero-aside"><b>${safe(state.data.sources.length)} loaded export${state.data.sources.length===1?'':'s'}</b>${safe(new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}</div></div>`;
}
function notice(){return state.data.sources.length && !state.data.entries.length?'<div class="notice warning">The published archive has no recognized loot awards yet.</div>':'';}
function empty(text='No matching records',detail='There are no published raid records to display yet.'){
  return `<div class="empty"><div class="empty-icon">⬡</div><h3>${safe(text)}</h3><p>${safe(detail)}</p></div>`;
}
function listSession(s){
  return `<div class="list-row action" data-action="session" data-id="${safe(s.id)}" role="button" tabindex="0"><div class="raid-glyph">⚔</div><div class="row-primary"><div class="row-title">${safe(s.name)}</div><div class="row-sub">${fmtDate(s.start)} · ${s.players.length} raiders</div></div><div class="row-right"><b>${s.entries.length} awards</b>${s.softRes.length} reserves</div><span class="muted">›</span></div>`;
}
function rollMiniStats(rows){const m=rollSummary(rows);return `<div class="roll-mini">${m.numericRolls} numeric rolls · ${m.wins} wins · ${m.avg===null?'No average':m.avg.toFixed(1)+' average'}</div>`;}
function listLoot(e){return `<div class="list-row">${icon(e.item)}<div class="row-primary"><div class="row-title">${itemName(e.item)}</div><div class="row-sub">${safe(e.winner||'Unassigned')} · ${safe(e.sessionName)}</div></div>${modeTag(e.mode)}</div>`;}
function latestIdentity(p){return [...(p.memberRecords||[])].sort((a,b)=>{return String(b.gear?.capturedAt||b.sessionName||'').localeCompare(String(a.gear?.capturedAt||a.sessionName||''));})[0]||null;}
function identityText(value){return value&&value!=='Unknown'?safe(value):'<span class="muted">Not captured</span>';}
function listPlayer(p){return `<div class="list-row action" data-action="player" data-id="${safe(p.name)}" role="button" tabindex="0"><span class="avatar">${safe(p.name.slice(0,1).toUpperCase())}</span><div class="row-primary"><div class="row-title">${safe(p.name)}</div><div class="row-sub">${p.sessionIds.size} raid sessions · ${identityText(latestIdentity(p)?.class)}</div></div><div class="row-right"><b>${p.awards.length} items</b>${p.rolls.length} roll records</div><span class="muted">›</span></div>`;}
function overview(){const {sessions,entries,players}=state.data;
  return `${header('Raid Overview','One place for every session, every award, and every raider.')}${notice()}${stats()}<div class="overview-layout">
  <div class="panel"><div class="panel-head"><div><h2>Recent raid sessions</h2><p>Latest published raid sessions</p></div><button class="panel-link" data-view="sessions">VIEW ALL →</button></div>${sessions.length?sessions.slice(0,6).map(listSession).join(''):empty('Your raid history starts here')}</div>
  <div class="panel"><div class="panel-head"><div><h2>Latest loot awards</h2><p>Most recent recorded item distributions</p></div><button class="panel-link" data-view="loot">VIEW ALL →</button></div>${entries.length?[...entries].sort((a,b)=>((b.timestamp||'').localeCompare(a.timestamp||''))).slice(0,6).map(listLoot).join(''):empty('No loot awards yet')}</div>
  </div><div style="height:17px"></div><div class="two-panels"><div class="panel"><div class="panel-head"><div><h2>Leading raiders</h2><p>Based strictly on recorded awards</p></div><button class="panel-link" data-view="players">VIEW RAIDERS →</button></div>${players.filter(p=>p.awards.length).slice(0,5).map(listPlayer).join('')||empty('No player awards')}</div>
  <div class="panel"><div class="panel-head"><div><h2>About this archive</h2><p>Guild loot transparency</p></div></div><div class="insight"><div class="insight-kicker">HISTORY</div><div class="insight-value">Every recorded award</div><div class="insight-sub">Browse completed sessions and see who received each item.</div></div><div class="insight"><div class="insight-kicker">RAIDERS</div><div class="insight-value">Player histories</div><div class="insight-sub">Explore awards and historical SoftRes snapshots.</div></div><div class="insight"><div class="insight-kicker">READ-ONLY</div><div class="insight-value">GitHub-managed data</div><div class="insight-sub">Guild officers publish exports through the GitHub repository.</div></div></div></div>`;
}
function toolbar({searchLabel='Search loot, names, raids…',session=false,mode=false}={}){
  const sessOptions=state.data.sessions.map(s=>`<option value="${safe(s.id)}" ${state.session===s.id?'selected':''}>${safe(s.name)} · ${fmtDate(s.start)}</option>`).join('');
  return `<div class="toolbar"><label class="searchbox"><span>⌕</span><input id="archive-search" type="search" value="${safe(state.search)}" placeholder="${safe(searchLabel)}" autocomplete="off" aria-label="Search archive"></label>${session?`<select id="session-filter" aria-label="Filter by raid"><option value="all">All sessions</option>${sessOptions}</select>`:''}${mode?`<select id="mode-filter" aria-label="Filter by roll type">${['all','Main Spec','Off Spec','Transmog','Soft Res','Pass','Unspecified'].map(v=>`<option ${state.mode===v?'selected':''} value="${v}">${v==='all'?'All award types':v}</option>`).join('')}</select>`:''}</div>`;
}
function qMatch(...parts){const q=state.search.toLowerCase().trim();return !q||parts.some(p=>String(p??'').toLowerCase().includes(q));}
function renderSessions(){const data=state.data.sessions.filter(s=>qMatch(s.name,s.guild,s.start,s.sourceName,...s.players,...s.entries.map(e=>e.item.name)));
return `${header('Raid Sessions','Browse complete raid histories and examine every drop.')}${notice()}<div class="panel">${toolbar({searchLabel:'Search sessions, raiders, dates…'})}${data.length?data.map(listSession).join(''):empty('No matching raid sessions','Try changing your search.')}<div class="row-count">${data.length} of ${state.data.sessions.length} sessions</div></div>`;}
function renderLoot(){const entries=state.data.entries.filter(e=>(state.session==='all'||e.sessionId===state.session)&&(state.mode==='all'||e.mode===state.mode)&&qMatch(e.item.name,e.item.id,e.winner,e.mode,e.sessionName,e.boss));
return `${header('Loot History','Search every recorded award across the complete archive.')}${notice()}<div class="panel">${toolbar({session:true,mode:true})}<div class="table-wrap"><table><thead><tr><th>ITEM</th><th>AWARDED TO</th><th>ROLL TYPE</th><th>RAID SESSION</th><th>BOSS</th><th>ROLLS</th><th>DATE</th></tr></thead><tbody>${entries.map(e=>`<tr><td><div class="item-cell">${icon(e.item,true)}<span><b>${itemName(e.item)}</b>${e.item.id?`<div class="row-sub">Item #${e.item.id}</div>`:''}</span></div></td><td><button class="panel-link" data-action="player" data-id="${safe(e.winner)}">${safe(e.winner||'Unassigned')}</button></td><td>${modeTag(e.mode)}</td><td><button class="panel-link" data-action="session" data-id="${safe(e.sessionId)}">${safe(e.sessionName)}</button></td><td>${safe(e.boss||'—')}</td><td>${(()=>{const session=state.data.sessions.find(s=>s.id===e.sessionId);const contest=session?.contests.find(c=>c.id===e.contestId||c.rounds.some(r=>r.id===e.roundId||r.id===e.id));return contest?`<button class="panel-link" data-action="contest" data-id="${safe(contest.id)}" data-session="${safe(session.id)}">${contest.rounds.reduce((n,r)=>n+r.rolls.length,0)} entries ↗</button>`:'—';})()}</td><td>${fmtDate(e.timestamp)}</td></tr>`).join('')}</tbody></table>${!entries.length?empty('No matching loot awards'):''}</div><div class="row-count">Showing ${entries.length} of ${state.data.entries.length} awards</div></div>`;}
function renderPlayers(){const players=state.data.players.filter(p=>qMatch(p.name,latestIdentity(p)?.class,latestIdentity(p)?.race,...p.awards.map(a=>a.item.name)));
return `${header('Raiders','See every participant and what they have won.')}${notice()}<div class="panel">${toolbar({searchLabel:'Find a raider or awarded item…'})}<div class="table-wrap"><table><thead><tr><th>RAIDER</th><th>CLASS</th><th>RACE</th><th>SEX (CHARACTER)</th><th>RAIDS</th><th>TOTAL AWARDS</th><th>MAIN SPEC</th><th>OFF SPEC</th><th>SOFT RES SNAPSHOTS</th><th></th></tr></thead><tbody>${players.map(p=>`<tr><td><div style="display:flex;align-items:center;gap:11px"><span class="avatar">${safe(p.name.slice(0,1).toUpperCase())}</span><button class="raider-name-link" data-action="player" data-id="${safe(p.name)}">${safe(p.name)} <span aria-hidden="true">↗</span></button></div></td><td>${identityText(latestIdentity(p)?.class)}</td><td>${identityText(latestIdentity(p)?.race)}</td><td>${identityText(latestIdentity(p)?.characterSex)}</td><td>${p.sessionIds.size}</td><td>${p.awards.length}</td><td>${p.awards.filter(a=>a.mode==='Main Spec').length}</td><td>${p.awards.filter(a=>a.mode==='Off Spec').length}</td><td>${p.reserves.length}</td><td><button class="view-button" data-action="player" data-id="${safe(p.name)}">View ↗</button></td></tr>`).join('')}</tbody></table>${!players.length?empty('No matching raiders'):''}</div><div class="row-count">${players.length} of ${state.data.players.length} raiders</div></div>`;}
function barRows(data){const max=Math.max(1,...data.map(r=>r[1]));return `<div class="stat-bars">${data.map(([name,count])=>`<div class="stat-bar"><span title="${safe(name)}">${safe(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(count/max*100)}%"></div></div><b>${num(count)}</b></div>`).join('')||'<div class="muted small">No awards to chart.</div>'}</div>`;}
function rollBadge(r){return `<span class="roll-value ${r.won===true?'winning':''}">${r.value===null?'—':r.value}</span>`;}
function rollTable(rows,limit=100){
return `<div class="table-wrap"><table class="roll-table"><thead><tr><th>RAIDER</th><th>ITEM</th><th>TYPE</th><th>ROLL</th><th>METHOD</th><th>ATTEMPT</th><th>STATUS</th><th>OUTCOME</th><th>RAID</th></tr></thead><tbody>${rows.slice(0,limit).map(r=>`<tr><td><button class="panel-link" data-action="player" data-id="${safe(r.player)}">${safe(r.player)}</button></td><td>${itemName(r.item)}</td><td>${modeTag(r.mode)}</td><td>${rollBadge(r)}<span class="muted"> / ${Number(r.max)||100}</span></td><td>${safe(r.voteMethod||'Unknown')}</td><td>${Number.isFinite(r.attempt)?r.attempt:1}</td><td>${safe(r.status||'—')}</td><td>${r.won===true?'<span class="won-label">WON</span>':r.won===false?'Not won':'—'}</td><td>${safe(r.sessionName)}</td></tr>`).join('')}</tbody></table>${!rows.length?empty('No roll records','The addon must include participant roll records in future exports. Older archives remain browsable.'):''}</div>${rows.length>limit?`<div class="row-count">Showing latest ${limit} of ${rows.length} records</div>`:''}`;
}
function rollTrend(rows){
const numeric=rows.filter(r=>r.value!==null).slice().sort((a,b)=>(a.timestamp||'').localeCompare(b.timestamp||''));
if(numeric.length<2)return '<div class="muted small">At least two numeric rolls are needed to draw a trend.</div>';
const max=100;const points=numeric.slice(-90).map((r,i,a)=>`${28+i*660/Math.max(1,a.length-1)},${187-Math.min(max,r.value/r.max*100)*1.55}`).join(' ');
return `<svg viewBox="0 0 720 215" class="roll-trend" role="img" aria-label="Roll percentile trend, ordered by date"><line x1="28" y1="32" x2="28" y2="187"/><line x1="28" y1="187" x2="688" y2="187"/><line x1="28" y1="109" x2="688" y2="109" class="gridline"/><text x="1" y="38">100</text><text x="7" y="114">50</text><text x="13" y="191">0</text><polyline points="${points}"/></svg><div class="muted small">Numeric rolls scaled to percent of each roll’s maximum; oldest to newest. Last ${Math.min(90,numeric.length)}.</div>`;
}
function rollDistribution(rows){
 const numeric=rows.filter(r=>r.value!==null);if(!numeric.length)return '<p class="muted small">No numeric rolls recorded for this selection.</p>';
 const bins=Array.from({length:10},(_,i)=>[`${i*10+1}–${(i+1)*10}`,0]);
 numeric.forEach(r=>{const pct=r.value/r.max*100;bins[Math.min(9,Math.max(0,Math.ceil(pct/10)-1))][1]++;});
 return `<div class="distribution">${bins.map(([name,count])=>`<div class="distribution-col" title="${name}%: ${count} rolls"><b>${count||''}</b><div class="distribution-track"><div style="height:${(count/Math.max(1,...bins.map(v=>v[1])))*100}%"></div></div><small>${name}</small></div>`).join('')}</div><p class="muted small">Rolls grouped by percentile; compatible with different dice ranges.</p>`;
}
function renderRolls(){
 const raiderOptions=state.data.players.filter(p=>p.rolls.length).sort((a,b)=>a.name.localeCompare(b.name)).map(p=>`<option value="${safe(p.name)}" ${state.raider===p.name?'selected':''}>${safe(p.name)}</option>`).join('');
 const sessionOptions=state.data.sessions.map(s=>`<option value="${safe(s.id)}" ${state.session===s.id?'selected':''}>${safe(s.name)}</option>`).join('');
 const filtered=state.data.rolls.filter(r=>(state.raider==='all'||r.player===state.raider)&&(state.session==='all'||r.sessionId===state.session)&&(state.mode==='all'||r.mode===state.mode));
 const m=rollSummary(filtered);const metricValue=v=>v===null?'—':v;
 const modeBreakdown=['Main Spec','Off Spec','Transmog','Soft Res','Pass'].map(name=>[name,filtered.filter(r=>r.mode===name).length]);
 return `${header('Roll Analytics','Every individual roll, its category, and its outcome.')}
 <div class="panel roll-filter-panel"><label>Raider<select id="roll-raider"><option value="all">All raiders</option>${raiderOptions}</select></label><label>Session<select id="session-filter"><option value="all">All sessions</option>${sessionOptions}</select></label><label>Category<select id="mode-filter">${['all','Main Spec','Off Spec','Transmog','Soft Res','Pass'].map(v=>`<option value="${v}" ${state.mode===v?'selected':''}>${v==='all'?'All categories':v}</option>`).join('')}</select></label></div>
 <div class="roll-metrics">${[['ROLL ENTRIES',m.participations,'Includes votes and passes'],['NUMERIC ROLLS',m.numericRolls,'Only actual dice results'],['AVERAGE',m.avg===null?'—':m.avg.toFixed(1),'Of numeric results'],['BEST ROLL',metricValue(m.best),'Highest numeric result'],['WINS',m.wins,'Finalized awarded rounds'],['WIN RATE',m.winRate===null?'—':(m.winRate*100).toFixed(1)+'%','Only resolved, non-pass entries']].map(([title,value,detail])=>`<div class="roll-metric"><small>${title}</small><strong>${value}</strong><span>${detail}</span></div>`).join('')}</div>
 <div class="two-panels"><div class="panel"><div class="panel-head"><div><h2>Roll distribution</h2><p>Frequency by roll percentile</p></div></div><div class="roll-chart-content">${rollDistribution(filtered)}</div></div><div class="panel"><div class="panel-head"><div><h2>Roll trend</h2><p>Individual numeric rolls through time</p></div></div><div class="roll-chart-content">${rollTrend(filtered)}</div></div></div>
 <div style="height:17px"></div><div class="two-panels"><div class="panel"><div class="panel-head"><h2>Categories chosen</h2></div><div class="roll-chart-content">${barRows(modeBreakdown)}</div></div><div class="panel"><div class="panel-head"><h2>Statistics explained</h2></div><div class="roll-chart-content"><p class="muted">An average includes <b>numeric rolls only</b>. Passes, unrolled SoftRes eligibility, and categories without a dice result are excluded.</p><p class="muted">Wins are attributed only when the export identifies a winner or a resolved roll. Older exports without roll details do not create estimated rolls.</p><p class="muted">Roll percentages are shown on charts to support different roll ranges. The average displays the original dice values.</p></div></div></div>
 <div style="height:17px"></div><div class="panel"><div class="panel-head"><h2>Individual roll history</h2><p>${filtered.length} records</p></div>${rollTable(filtered.slice().sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||'')),200)}</div>`;
}
function sessionMembers(s){
  if(s.members.length)return s.members;
  return s.players.map(name=>({key:name.toLowerCase(),name,class:'Unknown',race:'Unknown',characterSex:'Unknown',gear:null}));
}
function gearStatus(member){return member.gear?'<span class="won-label">Captured</span>':'<span class="muted">Not captured</span>';}
function gearRow(s,member){return `<tr><td><button class="panel-link" data-action="${member.gear?'gear':'player'}" data-id="${safe(member.gear?member.key:member.name)}" data-session="${safe(s.id)}">${safe(member.name)} ${member.gear?'↗':''}</button></td>
<td>${identityText(member.class)}</td><td>${identityText(member.race)}</td><td>${identityText(member.characterSex)}</td>
<td>${gearStatus(member)}</td><td>${member.gear?fmtDate(member.gear.capturedAt)+' '+fmtTime(member.gear.capturedAt):'—'}</td>
<td>${member.gear?`${member.gear.equippedCount} / 19`:'—'}</td><td>${member.gear?`<button class="view-button" data-action="gear" data-id="${safe(member.key)}" data-session="${safe(s.id)}">View equipment ↗</button>`:'—'}</td></tr>`;}
function gearTable(s,rows=sessionMembers(s)){
  return `<div class="table-wrap"><table class="gear-table"><thead><tr><th>CHARACTER</th><th>CLASS</th><th>RACE</th><th>CHARACTER SEX</th><th>CAPTURE STATUS</th><th>CAPTURED AT</th><th>EQUIPPED</th><th>DETAILS</th></tr></thead>
  <tbody>${rows.map(m=>gearRow(s,m)).join('')}</tbody></table></div>`;
}
function gearPreviewItems(member){
  if(!member.gear)return '<span class="muted">No scan recorded</span>';
  return [1,5,11,13,16,17,18].map(n=>{
    const slot=member.gear.slots[n-1];
    return `<span class="preview-item" title="${safe(slot?.label||'')} — ${safe(slot?.item?.name||'Empty')}">${slot&&!slot.empty?icon(slot.item,true,slot.label,true):'<span class="mini-empty" aria-label="Empty slot">−</span>'}</span>`;
  }).join('');
}
function gearCard(s,m){
  const isCaptured=!!m.gear;
  const primary=isCaptured?`data-action="gear" data-id="${safe(m.key)}" data-session="${safe(s.id)}" role="button" tabindex="0"`:'';
  return `<article class="gear-card ${isCaptured?'gear-card-action':''}" ${primary}>
    <div class="gear-card-head"><div class="gear-avatar">${safe(m.name.slice(0,1).toUpperCase())}</div><div class="gear-card-identity"><div class="gear-card-title">${safe(m.name)}</div><div class="gear-card-secondary">${identityText(m.class)} · ${identityText(m.race)} · ${identityText(m.characterSex)} · ${identityText(m.role||'Unknown role')}</div></div><div class="gear-card-chevron">${isCaptured?'↗':''}</div></div>
    <div class="gear-card-session">${safe(s.name)} · ${fmtDate(s.start)}</div>
    <div class="gear-preview" aria-label="Equipped item preview">${gearPreviewItems(m)}</div>
    <div class="gear-card-foot"><span>${isCaptured?`${m.gear.equippedCount} / 19 equipped`:'Not captured'}</span><strong>${isCaptured?'View all 19 slots →':'No equipment snapshot'}</strong></div>
  </article>`;
}
function renderGear(){
 const sessions=state.data.sessions.filter(s=>state.session==='all'||state.session===s.id);
 const listings=sessions.flatMap(s=>sessionMembers(s).filter(m=>qMatch(m.name,m.class,m.race,m.role,s.name)).map(m=>({s,m})));
 const captured=listings.filter(x=>x.m.gear).length;
 const equipped=listings.flatMap(x=>x.m.gear?.slots.filter(slot=>!slot.empty)||[]);
 const missingIconNames=equipped.filter(slot=>!safeSlug(slot.item?.icon)).length;
 return `${header('Raid Gear','Select a raider to view every equipped item from that specific raid session.')}
 ${missingIconNames?`<div class="notice" role="note">${missingIconNames} of ${equipped.length} equipped items lack a web-compatible icon texture name in the published export. Distinct equipment symbols are shown instead of blank squares. Accurate item artwork requires icon filenames from the addon or a verified Forever item-icon mapping.</div>`:''}
 <div class="panel"><div class="panel-head"><div><h2>Choose a raider</h2><p>${captured} captured equipment snapshots / ${listings.length} participants. Click any captured player card to open all 19 slots.</p></div></div>
 ${toolbar({searchLabel:'Search by raider, class, role, raid…',session:true})}
 <div class="gear-cards">${listings.length?listings.map(({s,m})=>gearCard(s,m)).join(''):empty('No roster or equipment found','Upload a v7 session export to show recorded equipment.')}</div>
 </div>`;
}

function slotContents(slot){
  if(slot.empty)return `<span class="slot-empty">Empty at capture</span>`;
  const item=slot.item;
  return `<span class="slot-item">${icon(item,true)}<span>${itemName(item)}${item.id?`<small>Item #${item.id}</small>`:'<small>Item ID not available</small>'}</span></span>`;
}
function equipmentMarkup(member){
  const g=member?.gear;
  if(!g)return '<div class="muted small">Equipment was not captured for this session.</div>';
  return `<div class="equipment-grid">${g.slots.map(slot=>`<div class="equip-slot ${slot.empty?'is-empty':''}"><span class="slot-number">${slot.slot.toString().padStart(2,'0')} · ${safe(slot.label)}</span>${slotContents(slot)}</div>`).join('')}</div>`;
}
function openGear(sessionId,key){
  const session=state.data.sessions.find(s=>s.id===sessionId);
  const member=session?.members.find(m=>m.key===key);
  if(!member||!member.gear){toast('No equipment snapshot was captured for this character.',true);return;}
  const g=member.gear;
  const content=`<div class="drawer-section"><div class="drawer-kv"><div class="kv"><small>RAID SESSION</small><b>${safe(session.name)}</b></div><div class="kv"><small>ROLE</small><b>${identityText(member.role)}</b></div><div class="kv"><small>CLASS / RACE</small><b>${identityText(member.class)} · ${identityText(member.race)}</b></div><div class="kv"><small>EQUIPPED</small><b>${g.equippedCount} / 19</b></div></div>
  <p class="small muted">Captured ${fmtDate(g.capturedAt)} ${fmtTime(g.capturedAt)} · ${safe(g.captureMethod==='MASTER_SELF'?'Master snapshot':g.captureMethod==='RAIDER_ADDON'?'Raider addon snapshot':g.captureMethod||'Unknown method')}</p>
  <div class="notice">Equipment recorded at scan time in this session. It is not a live armory. Item images are exact only when an icon texture was exported; symbols indicate missing icon metadata.</div></div>
  <div class="drawer-section"><button class="panel-link" data-action="player" data-id="${safe(member.name)}">← Back to ${safe(member.name)} profile</button><h3>All 19 equipment slots</h3>${equipmentMarkup(member)}</div>`;
  showDrawer('RAID EQUIPMENT',member.name,content);
}

function identityDistribution(field){
 const map=new Map();for(const session of state.data.sessions){for(const member of sessionMembers(session)){
   const group=member[field];const key=group&&group!=='Unknown'?group:'Unknown / Not captured';map.set(key,(map.get(key)||0)+1);
 }}return [...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
}
function renderStatistics(){const {players,entries,sessions}=state.data;const m=new Map();for(const e of entries)m.set(e.mode,(m.get(e.mode)||0)+1);const total=entries.length,sorted=[...m].sort((a,b)=>b[1]-a[1]);
return `${header('Archive Statistics','Distribution trends across your recorded raid nights.')}${notice()}${stats()}<div class="identity-note muted small">Character identity and equipment values describe in-game characters only. Each character is counted once per session; unknown data is kept separate.</div><div class="two-panels"><div class="panel"><div class="panel-head"><div><h2>Awards by roll category</h2><p>Results already confirmed in the loot history</p></div></div>${barRows(sorted)}</div><div class="panel"><div class="panel-head"><div><h2>Top loot recipients</h2><p>Item awards recorded per player</p></div></div>${barRows(players.filter(p=>p.awards.length).slice(0,8).map(p=>[p.name,p.awards.length]))}</div></div><div style="height:17px"></div><div class="two-panels"><div class="panel"><div class="panel-head"><div><h2>Sessions by instance</h2><p>Where your group has been raiding</p></div></div>${barRows([...sessions.reduce((map,s)=>(map.set(s.name,(map.get(s.name)||0)+1),map),new Map())].sort((a,b)=>b[1]-a[1]).slice(0,8))}</div><div class="panel"><div class="panel-head"><div><h2>Understanding the numbers</h2></div></div><div class="insight"><div class="insight-kicker">CONFIRMED AWARDS</div><div class="insight-value">${num(total)}</div><div class="insight-sub">Counts are taken from recorded loot history, not rolls or reservations.</div></div><div class="insight"><div class="insight-kicker">SOFT RESERVE SNAPSHOTS</div><div class="insight-value">Historical records</div><div class="insight-sub">Snapshots can include already-consumed reserves and duplicate reserves. They are not current eligibility lists.</div></div><div class="insight"><div class="insight-kicker">DATA QUALITY</div><div class="insight-value">Only what was exported</div><div class="insight-sub">Missing raid members, timestamps, or roll categories are not inferred.</div></div></div></div><div style="height:17px"></div><div class="identity-grid"><div class="panel"><div class="panel-head"><h2>Class distribution</h2></div>${barRows(identityDistribution('classToken'))}</div><div class="panel"><div class="panel-head"><h2>Race distribution</h2></div>${barRows(identityDistribution('raceToken'))}</div><div class="panel"><div class="panel-head"><h2>In-game character sex</h2></div>${barRows(identityDistribution('characterSex'))}</div></div>`;
}
function render(){if(!state.ready){main.innerHTML='<div class="loader">Loading raid archive…</div>';return;}
  setStatus();document.querySelectorAll('[data-view].nav-button').forEach(el=>el.classList.toggle('active',el.dataset.view===state.view));
  $('#breadcrumb').textContent=(viewNames[state.view]||'Overview').toUpperCase();
  let active=document.activeElement,focusId=active?.id,selection=active?.selectionStart;
  main.innerHTML=({overview, sessions:renderSessions,loot:renderLoot,players:renderPlayers,gear:renderGear,rolls:renderRolls,statistics:renderStatistics}[state.view]||overview)();
  if(focusId==='archive-search'){const input=$('#archive-search');if(input){input.focus();if(typeof selection==='number')input.setSelectionRange(selection,selection);}}
  try{if(window.WH?.Tooltips?.refreshLinks)window.WH.Tooltips.refreshLinks();else if(window.$WowheadPower?.refreshLinks)window.$WowheadPower.refreshLinks();}catch(e){console.warn('Wowhead tooltip refresh failed:',e)}
}
function showDrawer(eyebrow,title,html){$('#drawer-eyebrow').textContent=eyebrow;$('#drawer-title').textContent=title;$('#drawer-body').innerHTML=html;const d=$('#drawer');if(!d.open)d.showModal();try{window.WH?.Tooltips?.refreshLinks?.();window.$WowheadPower?.refreshLinks?.();}catch{}}
function openSession(id,updateHash=true){const s=state.data.sessions.find(s=>s.id===id);if(!s){toast('Session not found in the loaded archive.',true);return;}
 const content=`<div class="drawer-section"><div class="drawer-kv"><div class="kv"><small>DATE</small><b>${fmtDate(s.start)}</b></div><div class="kv"><small>START TIME</small><b>${fmtTime(s.start)||'Unknown'}</b></div><div class="kv"><small>AWARDS</small><b>${s.entries.length}</b></div><div class="kv"><small>PARTICIPANTS</small><b>${s.players.length}</b></div></div><p class="small muted">${safe(s.guild||s.sourceName)} · Export schema: ${safe(s.schema)}</p><button class="subtle-button" data-action="share" data-id="${safe(s.id)}">Copy session link</button></div>
 <div class="drawer-section"><h3>Loot distributed</h3>${s.entries.length?s.entries.map(e=>`<div class="list-row" style="padding-left:0;padding-right:0">${icon(e.item)}<div class="row-primary"><div class="row-title">${itemName(e.item)}</div><div class="row-sub">${safe(e.winner||'Unassigned')}${e.boss?' · '+safe(e.boss):''}</div></div>${modeTag(e.mode)}</div>`).join(''):'<div class="muted small">No awarded items recorded.</div>'}</div>
 <div class="drawer-section"><h3>Recorded loot contests <span class="pill">${s.contests.length} CONTESTS</span></h3><p class="small muted">Ties and reroll windows remain linked to their original contest. Only confirmed awards count as distributed loot.</p>${s.contests.length?s.contests.map(contest=>`<div class="list-row"><div class="row-primary"><div class="row-title">${itemName(contest.item)}</div><div class="row-sub">${contest.rounds.length} voting window${contest.rounds.length===1?'':'s'} · ${contest.rounds.reduce((n,r)=>n+r.rolls.length,0)} participant records ${contest.rounds.some(r=>r.tied)?' · Tie/reroll':''}</div></div><button class="view-button" data-action="contest" data-id="${safe(contest.id)}" data-session="${safe(s.id)}">View contest ↗</button></div>`).join(''):'<div class="muted small">No vote or roll history was exported.</div>'}</div>
 <div class="drawer-section"><h3>Raid gear <span class="pill">${s.members.filter(m=>m.gear).length} / ${s.members.length||s.players.length} CAPTURED</span></h3><p class="small muted">Equipment is from each raider's last successful scan in this session. Not captured is not the same as not having the addon.</p>${s.members.length?gearTable(s):'<p class="muted small">No equipment snapshots in this session. Older session exports do not contain gear data.</p>'}</div>
 <div class="drawer-section"><h3>Soft reserve snapshot <span class="pill">${s.softRes.length} ENTRIES</span></h3><p class="small muted">This is a historical snapshot and can include consumed or duplicate reserves.</p>${s.softRes.length?s.softRes.map(r=>`<div class="list-row" style="padding-left:0;padding-right:0">${icon(r.item,true)}<div class="row-primary"><div class="row-title">${itemName(r.item)}</div><div class="row-sub">${safe(r.raider||'Unknown raider')} · ${r.consumed?'Consumed'+(r.awardRecipient?' by '+safe(r.awardRecipient):''):'Not consumed in snapshot'}</div></div></div>`).join(''):'<div class="muted small">No reserves found in this export.</div>'}</div>
 <div class="drawer-section"><h3>Raiders</h3><div class="chip-list">${s.players.map(p=>`<button class="chip" data-action="player" data-id="${safe(p)}">${safe(p)}</button>`).join('')||'<span class="muted">No roster data</span>'}</div></div>`;
 showDrawer('RAID SESSION',s.name,content);
 if(updateHash)safeHistoryReplace(`#session=${encodeURIComponent(s.id)}`);
}
function openContest(id,sessionId){
 const session=state.data.sessions.find(s=>s.id===sessionId);
 const contest=session?.contests.find(c=>c.id===id);
 if(!contest){toast('Roll contest not found.',true);return;}
 const awarded=contest.award;
 const meta=`<div class="drawer-section"><div class="drawer-kv"><div class="kv"><small>FINAL WINNER</small><b>${safe(awarded?.winner||contest.winner||'Not confirmed')}</b></div><div class="kv"><small>VOTING WINDOWS</small><b>${contest.rounds.length}</b></div><div class="kv"><small>CONFIRMED AWARD</small><b>${awarded?'Yes':'No'}</b></div><div class="kv"><small>SESSION</small><b>${safe(session.name)}</b></div></div></div>`;
 const rounds=contest.rounds.map((r,i)=>`<div class="drawer-section"><h3>${r.tiebreakerRound?'Tie reroll '+r.tiebreakerRound:'Original vote'} ${r.tied?'<span class="tag off">SUPERSEDED TIE</span>':''}</h3>
 <p class="muted small">Window ${safe(r.id)} · ${safe(r.kind||'Standard')} · ${safe(r.disposition||'Unresolved')}${r.tiePlayers.length?' · Tied: '+r.tiePlayers.map(safe).join(', '):''}</p>
 ${rollTable(r.rolls.map(x=>({...x,sessionName:session.name})),150)}</div>`).join('');
 showDrawer('LOOT CONTEST',contest.item.name,meta+rounds);
}
function openRound(id,sessionId){
 const session=state.data.sessions.find(s=>s.id===sessionId);
 const round=session?.rollEvents.find(r=>r.id===id);
 if(!round){toast('Roll round not found.',true);return;}
 const rows=round.rolls.map(r=>({...r,sessionName:session.name}));
 const summary=rollSummary(rows);
 showDrawer('ITEM ROLL DETAILS',round.item.name,`<div class="drawer-section"><div class="drawer-kv"><div class="kv"><small>WINNER</small><b>${safe(round.winner||'Not resolved')}</b></div><div class="kv"><small>PARTICIPANTS</small><b>${rows.length}</b></div><div class="kv"><small>NUMERIC ROLLS</small><b>${summary.numericRolls}</b></div><div class="kv"><small>SESSION</small><b>${safe(session.name)}</b></div></div></div><div class="drawer-section">${rollTable(rows,100)}</div>`);
}
function openPlayer(name){const p=state.data.players.find(p=>p.name.toLowerCase()===String(name).toLowerCase());if(!p){toast('Raider not found.',true);return;}
 const identity=latestIdentity(p);
 const profileIdentity=`<div class="drawer-section"><h3>Character identity</h3><div class="drawer-kv"><div class="kv"><small>CLASS</small><b>${identityText(identity?.class)}</b></div><div class="kv"><small>RACE</small><b>${identityText(identity?.race)}</b></div><div class="kv"><small>CHARACTER SEX</small><b>${identityText(identity?.characterSex)}</b></div><div class="kv"><small>CAPTURES</small><b>${p.memberRecords.filter(m=>m.gear).length}</b></div></div><p class="muted small">Identity reflects the available game character metadata, not the human player.</p></div>`;
 const plusOneHistory=`<div class="drawer-section"><h3>Recorded +1 values</h3><p class="muted small">Exported end-of-session +1 totals, shown per raid. Off Spec does not add +1.</p>${p.plusOnes.length?p.plusOnes.map(x=>`<div class="list-row"><div class="row-primary">${safe(x.sessionName)}</div><b>+${x.value}</b></div>`).join(''):'<span class="muted small">No +1 values exported.</span>'}</div>`;
 const records=p.memberRecords.filter(m=>m.gear).slice().sort((a,b)=>String(b.gear.capturedAt).localeCompare(String(a.gear.capturedAt)));
 const mostRecent=records[0]||null;
 const gearHistory=`<div class="drawer-section"><h3>Equipment by raid session</h3><p class="small muted">Select a session to inspect the exact 19 recorded slots. Latest capture is displayed below.</p>
 ${records.map(m=>`<div class="session-gear-option"><div><strong>${safe(m.sessionName)}</strong><small>${fmtDate(m.gear.capturedAt)} · ${m.gear.equippedCount}/19 equipped</small></div><button class="view-button" data-action="gear" data-id="${safe(m.key)}" data-session="${safe(m.sessionId)}">View all 19 slots ↗</button></div>`).join('')||'<p class="muted small">No equipment was captured for this raider.</p>'}
 ${mostRecent?`<h3 class="gear-preview-heading">Latest captured equipment · ${safe(mostRecent.sessionName)}</h3>${equipmentMarkup(mostRecent)}`:''}
 </div>`;

 const content=`<div class="drawer-section"><div class="drawer-kv"><div class="kv"><small>RAID SESSIONS</small><b>${p.sessionIds.size}</b></div><div class="kv"><small>LOOT AWARDS</small><b>${p.awards.length}</b></div><div class="kv"><small>MAIN SPEC</small><b>${p.awards.filter(a=>a.mode==='Main Spec').length}</b></div><div class="kv"><small>SOFT RES SNAPSHOTS</small><b>${p.reserves.length}</b></div></div></div><div class="drawer-section"><h3>Items received</h3>${p.awards.length?p.awards.map(e=>`<div class="list-row" style="padding-left:0;padding-right:0">${icon(e.item)}<div class="row-primary"><div class="row-title">${itemName(e.item)}</div><div class="row-sub">${safe(e.sessionName)}</div></div>${modeTag(e.mode)}</div>`).join(''):'<div class="muted small">No confirmed awards found.</div>'}</div><div class="drawer-section"><h3>Soft reserves in archived snapshots</h3>${p.reserves.length?p.reserves.map(r=>`<div class="list-row" style="padding-left:0;padding-right:0">${icon(r.item,true)}<div class="row-primary"><div class="row-title">${itemName(r.item)}</div><div class="row-sub">${safe(state.data.sessions.find(s=>s.id===r.sessionId)?.name||'Raid')} · ${r.consumed?'Consumed':'Not consumed in snapshot'}</div></div></div>`).join(''):'<div class="muted small">No historical reserves found.</div>'}</div>`;
 showDrawer('RAIDER PROFILE',p.name,profileIdentity+gearHistory+content+plusOneHistory+`<div class="drawer-section"><h3>Roll statistics</h3>${rollMiniStats(p.rolls)}${rollTable(p.rolls.slice().reverse(),80)}</div>`);safeHistoryReplace(`#player=${encodeURIComponent(p.name)}`);
}
function safeHistoryReplace(path){try{history.replaceState(null,'',path);}catch(e){console.warn('History unavailable:',e.message);}}
function closeDrawer(){const drawer=$('#drawer');if(drawer.open)drawer.close();if(location.hash)safeHistoryReplace(location.pathname+location.search);}
function processHash(){const m=location.hash.match(/^#(session|player)=(.+)$/);if(!m)return;let id;try{id=decodeURIComponent(m[2]);}catch{return;}if(m[1]==='session')openSession(id,false);else openPlayer(id);}
function route(view){if(!(view in viewNames))return;state.view=view;state.search='';state.mode='all';state.session='all';state.raider='all';document.body.classList.remove('nav-open');if($('#drawer').open)closeDrawer();render();}
document.addEventListener('click',async e=>{
 const view=e.target.closest('[data-view]');if(view){route(view.dataset.view);return;}
 const action=e.target.closest('[data-action]');if(!action)return;
 const id=action.dataset.id;switch(action.dataset.action){
  case 'session':openSession(id);break;case 'player':openPlayer(id);break;case 'round':openRound(id,action.dataset.session);break;case 'contest':openContest(id,action.dataset.session);break;case 'gear':openGear(action.dataset.session,id);break;
  case 'share':{
   const url=new URL(location.href);url.hash=`session=${encodeURIComponent(id)}`;
   try{await navigator.clipboard.writeText(url.href);toast('Session link copied. It works on the published site after this source is deployed.');}catch{toast('Could not copy automatically; use your address bar.',true);}
  }break;
 }
});
main.addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const a=e.target?.dataset?.action;if(!['session','player','gear'].includes(a))return;e.preventDefault();if(a==='session')openSession(e.target.dataset.id);if(a==='player')openPlayer(e.target.dataset.id);if(a==='gear')openGear(e.target.dataset.session,e.target.dataset.id);});
main.addEventListener('input',e=>{if(e.target.id==='archive-search'){state.search=e.target.value;render();}});
main.addEventListener('change',e=>{if(e.target.id==='session-filter')state.session=e.target.value;if(e.target.id==='mode-filter')state.mode=e.target.value;if(e.target.id==='roll-raider')state.raider=e.target.value;render();});
async function importPreviewFiles(files){
 if(!files?.length)return;
 const parsed=[];
 for(const file of files){if(!file.name.toLowerCase().endsWith('.json')){toast(`Skipped ${file.name}: JSON files only.`,true);continue;}
  if(file.size>10*1024*1024){toast(`${file.name} exceeds 10 MiB.`,true);continue;}
  try{const payload=JSON.parse(await file.text());const imports=unwrapImports(payload,file.name);
   if(!imports.length||!imports.every(x=>x.payload && (x.payload.schema||x.payload.sessions||x.payload.sessionId||x.payload.sessionName||x.payload.raidName))){throw Error('Not a recognized PlusOne export');}
   parsed.push(...imports);
  }catch(err){toast(`${file.name}: ${err.message}`,true);}
 }
 if(parsed.length){state.local=[...state.local,...parsed];refreshData();toast(`${parsed.length} export(s) loaded for local preview only. Publish them by committing JSON to raid-exports/ on GitHub.`);}
}
$('#import-files')?.addEventListener('change',e=>{importPreviewFiles([...e.target.files]);e.target.value='';});
$('#preview-clear')?.addEventListener('click',()=>{state.local=[];refreshData();toast('Local preview cleared. Published data is unchanged.');});
window.addEventListener('dragover',e=>{if([...e.dataTransfer?.types||[]].includes('Files'))e.preventDefault();});
window.addEventListener('drop',e=>{if([...e.dataTransfer?.types||[]].includes('Files')){e.preventDefault();importPreviewFiles([...e.dataTransfer.files]);}});
$('#mobile-nav').addEventListener('click' ,()=>document.body.classList.toggle('nav-open'));
$('#drawer-close').addEventListener('click',closeDrawer);
$('#drawer').addEventListener('click',e=>{if(e.target===$('#drawer'))closeDrawer();});
$('#drawer').addEventListener('close',()=>{if(location.hash)safeHistoryReplace(location.pathname+location.search);});
window.addEventListener('hashchange',processHash);
init();
