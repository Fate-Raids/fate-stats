/* PlusOne Raid Archive: flexible adapter for current and future JSON exports.
 * No original export fields are discarded; the raw JSON stays in each source archive.
 */
export const ARCHIVE_FORMAT = 'plusone-web-archive-v1';
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const pick = (o, keys) => { if (!isObj(o)) return undefined; for (const key of keys) if (o[key] !== undefined && o[key] !== null && o[key] !== '') return o[key]; };
const str = v => v === undefined || v === null ? '' : typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
const arrays = (o, keys) => keys.flatMap(key => Array.isArray(o?.[key]) ? [o[key]] : []);
const itemRE = /\|Hitem:(\d+)[^|]*\|h\[([^\]]+)\]\|h/i;
const itemRawRE = /(?:^|[^a-z])item:(\d+)(?::|\b)/i;
const itemURLRE = /(?:item=|\/item\/)(\d+)/i;
const sessionArrayKeys = ['sessions', 'archivedSessions','raidSessions','sessionHistory','raids','raidHistory','completedSessions','history'];
const entryArrayKeys = ['loot','lootHistory','lootEntries','lootLog','lootRecords','awards','items','drops','events','history','records','entries','distributedLoot'];
const nestedKeys = ['data','archive','export','payload','raid','session','history','raidHistory','raidData','sessionData'];
const resKeys = ['softResSnapshot','softresSnapshot','softReserves','softRes','softres','softResData','softReserve','softReservations','reservations','reserves'];
const dateKeys = ['startedAt','startTime','start','createdAt','date','timestamp','time','sessionDate','raidDate','openedAt'];
const endKeys = ['endedAt','endTime','end','closedAt','finishedAt'];
const playerKeys = ['winner','winnerName','awardedTo','recipient','receivedBy','lootedBy','player','playerName','owner','raider','character','to'];
const typeKeys = ['rollType','roll','spec','category','choice','vote','awardType','reason','lootType','mode'];
const itemKeys = ['item','itemLink','link','itemData','lootItem','awardedItem'];
const nameKeys = ['itemName','lootName','name','title'];
const itemIdKeys = ['itemID','itemId','item_id','itemid','id'];
const qualityKeys = ['itemQuality','quality','rarity','itemRarity','qualityId'];
const iconKeys = ['iconName','itemIconName','icon','itemIcon','iconPath','texture'];
const quantityKeys = ['count','quantity','stackCount','amount'];

export function hashText(text) {
  let a = 2166136261, b = 2166136261;
  for (let i=0;i<text.length;i++) { const c=text.charCodeAt(i); a=Math.imul(a^c, 16777619); b=Math.imul(b^(c+(i&255)),16777619); }
  return `${(a>>>0).toString(36)}${(b>>>0).toString(36)}${text.length.toString(36)}`;
}
export function makeSource(payload, filename='raid-export.json') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Expected a JSON object. Import a PlusOne session export or a site archive.');
  const id = hashText(JSON.stringify(payload));
  return { id, name:String(filename).slice(0,180), importedAt:new Date().toISOString(), payload };
}
export function isArchive(obj) {return isObj(obj) && obj.format===ARCHIVE_FORMAT && Array.isArray(obj.sources);}
export function unwrapImports(payload, filename) {
  if (isArchive(payload)) return payload.sources.filter(x=>isObj(x) && isObj(x.payload)).map(x=>({id:hashText(JSON.stringify(x.payload)),name:str(x.name)||filename,importedAt:str(x.importedAt)||new Date().toISOString(),payload:x.payload}));
  if (Array.isArray(payload)) return payload.map((p,i)=>makeSource(p,`${filename} [${i+1}]`));
  return [makeSource(payload,filename)];
}
function readDate(input) {
  if (input===undefined || input===null || input==='') return '';
  if (typeof input==='number') {
    let n=input; if (n>1e9 && n<1e11) n*=1000;
    const d=new Date(n); return Number.isFinite(d.valueOf())?d.toISOString():'';
  }
  if (/^\d{10,13}$/.test(String(input))) return readDate(Number(input));
  const d=new Date(input); return Number.isFinite(d.valueOf())?d.toISOString():'';
}
function findDate(o, keys=dateKeys) {return readDate(pick(o,keys));}
function plausibleSession(o){
  if (!isObj(o)) return false;
  if (arrays(o,entryArrayKeys.filter(k=>k!=='history')).length) return true;
  if (pick(o,['sessionID','sessionId','sessionName','raidName','raidZone','raidInstance','zone','instance'])!==undefined) return true;
  return !!(pick(o,['startTime','startedAt','endTime']) && (pick(o,['players','roster','participants'])||pick(o,resKeys)));
}
function plausibleEntry(o){
  if (!isObj(o)) return false;
  if (pick(o,playerKeys)!==undefined && pick(o,['item','itemLink','itemName','itemId','itemID','loot','item_id'])!==undefined) return true;
  if (pick(o,['winner','recipient','awardedTo','winnerName'])!==undefined && pick(o,['name','link','id'])!==undefined) return true;
  if (isObj(o.item) && pick(o.item,['name','id','itemId','itemID','link'])!==undefined) return true;
  if (typeof o.item==='string' && o.item.includes('|Hitem:')) return true;
  return false;
}
function sessionCandidates(data, depth=0, seen=new Set()) {
  if (!isObj(data) || depth>5 || seen.has(data)) return [];
  seen.add(data);
  for(const key of sessionArrayKeys) {
    const a=data[key];
    if (Array.isArray(a) && a.some(plausibleSession)) return a.filter(isObj);
    if (isObj(a) && a!==data) {
      const nested=sessionCandidates(a,depth+1,seen); if(nested.length) return nested;
    }
  }
  for(const key of nestedKeys) {
    const o=data[key];
    if(isObj(o)) {const nested=sessionCandidates(o,depth+1,seen);if(nested.length)return nested;}
  }
  // Some exports wrap sessions under a map keyed by numeric session id.
  for(const key of ['sessions','raidSessions','archive','sessionHistory']) {
    const o=data[key];if(isObj(o)){const a=Object.values(o).filter(plausibleSession);if(a.length)return a;}
  }
  if (plausibleSession(data)) return [data];
  return [];
}
function entryCandidates(data, depth=0, seen=new Set()) {
  if (depth>4||!isObj(data)||seen.has(data)) return [];
  seen.add(data);
  const entries=[];
  for(const key of entryArrayKeys){
    const a=data[key];
    if(Array.isArray(a)) entries.push(...a.filter(plausibleEntry));
    else if(isObj(a) && ['loot','lootHistory','lootEntries','awards','drops','records'].includes(key)) entries.push(...Object.values(a).filter(plausibleEntry));
  }
  if(entries.length)return entries;
  for(const key of ['data','session','sessionData','raid','result']){
    if(isObj(data[key])) {const sub=entryCandidates(data[key],depth+1,seen);if(sub.length)return sub;}
  }
  return [];
}
function extractName(obj, keys) {
  const v=pick(obj,keys);
  if(isObj(v))return str(pick(v,['name','fullName','characterName','playerName','displayName','label']))||str(v.id)||'';
  return str(v);
}
function parseItem(rec) {
  const item=pick(rec,itemKeys);
  const o=isObj(item)?item:{};
  const stringItem=str(item);
  const link=str(pick(rec,['itemLink','link','lootLink'])||pick(o,['link','itemLink'])||stringItem);
  const match=link.match(itemRE);
  const idFromLink=match?.[1]||link.match(itemRawRE)?.[1]||link.match(itemURLRE)?.[1];
  const fromRoot=pick(rec,['itemID','itemId','item_id','itemid']);
  const fromNested=pick(o,itemIdKeys);
  const rawId=fromRoot??fromNested??idFromLink;
  const itemId=/^\d+$/.test(str(rawId)) ? Number(rawId):null;
  let name=str(pick(rec,['itemName','lootName'])||pick(o,nameKeys)||match?.[2]);
  if(!name && stringItem && !stringItem.includes('|Hitem:')) name=stringItem;
  if(!name && !itemId) name=extractName(rec,['name','title']);
  if(!name && itemId) name=`Item #${itemId}`;
  const rawQuality=pick(rec,qualityKeys) ?? pick(o,qualityKeys);
  const qmap={poor:0,common:1,uncommon:2,rare:3,epic:4,legendary:5,artifact:6,heirloom:7};
  const quality=typeof rawQuality==='number'?rawQuality: /^\d+$/.test(str(rawQuality))?Number(rawQuality):qmap[str(rawQuality).toLowerCase()]??null;
  const rawIcon=pick(rec,['itemIconName','itemIcon','iconName','icon'])??pick(o,iconKeys);
  const icon=str(rawIcon).trim();
  const count=Number(pick(rec,quantityKeys)??pick(o,quantityKeys)??1);
  return {id:itemId,name:name||'Unknown item',link,quality,icon,count:Number.isFinite(count)&&count>0?count:1};
}
export function normalizeMode(raw){
  const t=str(raw).trim().toLowerCase().replace(/[\s_-]/g,'');
  if(['main','ms','mainspec','need','1','primary'].includes(t)) return 'Main Spec';
  if(['off','os','offspec','greed','2','secondary'].includes(t)) return 'Off Spec';
  if(['tmog','transmog','mog','appearance','3'].includes(t)) return 'Transmog';
  if(['softres','softreserve','sr','reserved','5'].includes(t))return 'Soft Res';
  if(['pass','passed','declined','0','4'].includes(t))return 'Pass';
  return str(raw).trim() || 'Unspecified';
}
function extractEntry(rec,i,sessionStart) {
  const item=parseItem(rec);
  let winner=extractName(rec,playerKeys);
  for(const key of ['award','result','distribution','outcome']) {
    if(!winner && isObj(rec[key])) winner=extractName(rec[key],playerKeys);
  }
  const rawMode=pick(rec,typeKeys)|| (isObj(rec.award)?pick(rec.award,typeKeys):undefined);
  const timestamp=findDate(rec,['timestamp','awardedAt','time','date','createdAt','completedAt']);
  return {
    id: str(pick(rec,['entryId','awardId','lootId','guid','id']))||String(i+1),
    item,
    winner:winner.trim(),mode:normalizeMode(rawMode),
    timestamp:timestamp||sessionStart, boss:extractName(rec,['boss','bossName','encounter','encounterName','source']),
    quantity:item.count,
    raw:rec,
  };
}
function softReservations(session, root) {
  const raw=pick(session,resKeys)??pick(root,resKeys);
  if(!raw)return [];
  const out=[];
  const add=(name,item)=>{
    if(isObj(item)) {
      const p=parseItem(item);
      const count=Number(pick(item,['reserveCount','reserveSlots','slots'])??1);
      // Entries remain independent; duplicate reserves are never silently merged.
      for(let j=0;j<Math.min(100,Math.max(1,Number.isFinite(count)?count:1));j++)out.push({raider:name||extractName(item,['raider','player','name']),item:p});
    }else if(typeof item==='string' || typeof item==='number') {
      out.push({raider:name,item:parseItem({item:typeof item==='number'?{itemId:item}:item})});
    }
  };
  if(Array.isArray(raw)) {
    for (const row of raw) {
      if(!isObj(row))continue;
      const name=extractName(row,['raider','player','playerName','name','character']);
      const entries=pick(row,['items','reserves','reservations','softRes','softReserves']);
      if(Array.isArray(entries)){for(const e of entries)add(name,e);}
      else add(name,row);
    }
  }else if(isObj(raw)) {
    for(const [key,row] of Object.entries(raw)) {
      if(Array.isArray(row))for(const e of row)add(key,e);
      else if(isObj(row)){
        const entries=pick(row,['items','reserves','reservations','softRes']);
        if(Array.isArray(entries))for(const e of entries)add(key,e);
        else add(key,row);
      } else add(key,row);
    }
  }
  return out;
}
// Numeric roll events are independent from awards. No numbers or winners are inferred
// when absent; a Pass or automatic reserve eligibility is not a numeric roll.
const rollEventKeys=['rollEvents','rollRounds','rollHistory'];
const participantKeys=['rolls','rollResults','participants','bids','votes'];
function participantRows(obj){
  const raw=pick(obj,participantKeys);
  if(Array.isArray(raw))return raw;
  if(isObj(raw))return Object.entries(raw).map(([name,value])=>isObj(value)?{player:name,...value}:{player:name,roll:value});
  return [];
}
function numericRoll(raw,maximum){
  if(raw===null || raw===undefined || raw==='' || typeof raw==='boolean')return null;
  const n=Number(raw);
  return Number.isInteger(n)&&n>=1&&n<=maximum?n:null;
}
function rollEvent(event,i,start,award=null){
  const participants=participantRows(event);
  if(!participants.length)return null;
  const item=parseItem(event.item!==undefined||event.itemId!==undefined||event.itemID!==undefined||event.itemLink!==undefined?event:(award||event));
  const winner=extractName(event,['winner','winnerName','awardedTo','recipient'])||award?.winner||'';
  const eventId=str(pick(event,['roundId','rollId','eventId','awardId','entryId','id']))||award?.id||`round-${i+1}`;
  const timestamp=findDate(event,['timestamp','resolvedAt','awardedAt','time','date','createdAt'])||award?.timestamp||start;
  const rows=participants.map((row,j)=>{
    const o=isObj(row)?row:{player:String(row)};
    const player=extractName(o,['player','playerName','raider','name','character','unit'])||'';
    if(!player)return null;
    const mode=normalizeMode(pick(o,['category','rollType','choice','vote','spec','mode','type']));
    const maxRaw=pick(o,['max','rollMax','sides','rollRange'])??pick(event,['max','rollMax','sides']);
    const max=Math.max(1,Math.min(100000,Number(maxRaw)||100));
    const value=numericRoll(pick(o,['value','rollValue','rollNumber','rollResult','roll']),max);
    const rawOutcome=str(pick(o,['outcome','result','status'])).toLowerCase().trim();
    const passed=mode==='Pass'||rawOutcome==='pass'||rawOutcome==='passed';
    const explicitWon=pick(o,['won','isWinner']);
    const laterWinnerAttempt=participants.slice(j+1).some(next=>isObj(next)&&extractName(next,['player','playerName','raider','name','character','unit']).toLowerCase()===player.toLowerCase());
    const won=typeof explicitWon==='boolean'?explicitWon:(!!winner && winner.toLowerCase()===player.toLowerCase()&&!passed&&!laterWinnerAttempt);
    const resolved=pick(event,['resolved','finalized'])===true||!!winner||rawOutcome==='lost'||rawOutcome==='won';
    return {id:`${eventId}:${j}`,eventId,player,mode,value,max,
      status:passed?'passed':value!==null?'rolled':'choice-only',
      won:resolved?won:null,timestamp,item,boss:extractName(event,['boss','bossName','encounter','encounterName'])||award?.boss||'',winner,
      raw:o};
  }).filter(Boolean);
  if(!rows.length)return null;
  return {id:eventId,item,winner,timestamp,boss:rows[0].boss,rolls:rows,raw:event};
}
function collectRollEvents(session,root,entries,start){
  const out=[],ids=new Set();
  const record=(event,i,award=null)=>{
    const r=rollEvent(event,i,start,award);
    if(!r)return;
    // Identical round identifiers within a session are one contest, even if
    // represented in both the session's rollEvents and an award's rolls.
    if(ids.has(r.id))return;ids.add(r.id);out.push(r);
  };
  let index=0;
  for(const key of rollEventKeys){
    const candidate=session[key]??(session===root?null:root[key]);
    if(Array.isArray(candidate))for(const event of candidate)if(isObj(event))record(event,index++);
  }
  for(const entry of entries){
    if(participantRows(entry.raw).length){
      const withId={...entry.raw,roundId:pick(entry.raw,['roundId','rollId','eventId','awardId','entryId'])||entry.id};
      record(withId,index++,entry);
    }
  }
  return out;
}
export function rollSummary(rows){
  const numeric=rows.filter(r=>r.value!==null && Number.isInteger(r.value));
  const resolved=rows.filter(r=>r.won!==null && r.value!==null && r.mode!=='Pass');
  const wins=resolved.filter(r=>r.won===true).length;
  const values=numeric.map(r=>r.value).sort((a,b)=>a-b);
  return {participations:rows.length,choices:rows.filter(r=>r.mode!=='Pass').length,
    numericRolls:numeric.length,passes:rows.filter(r=>r.mode==='Pass').length,
    avg:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,
    median:values.length?(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2:null,
    best:values.length?values[values.length-1]:null,worst:values.length?values[0]:null,
    wins,resolved:resolved.length,winRate:resolved.length?wins/resolved.length:null};
}

export function normalizeSource(source) {
  const root=source.payload;
  const candidates=sessionCandidates(root);
  const found=candidates.length>0?candidates:[root];
  return found.map((session,i)=>{
    const nested=isObj(session.session)?session.session:null;
    const start=findDate(session)||findDate(nested)||findDate(root);
    const end=findDate(session,endKeys)||findDate(root,endKeys);
    const name=extractName(session,['sessionName','raidName','name','title','instanceName','zone','instance','raidZone','raidInstance'])
      ||extractName(nested,['name','zone','instance'])
      ||extractName(root,['raidName','guild','name'])
      || `Raid session ${i+1}`;
    const rawId=str(pick(session,['sessionId','sessionID','raidId','raidID','guid','id']))||String(i+1);
    const entries=entryCandidates(session).map((r,j)=>extractEntry(r,j,start)).filter(e=>e.winner && !['none','nobody','unassigned'].includes(e.winner.toLowerCase()));
    const softRes=softReservations(session,root);
    const rollEvents=collectRollEvents(session,root,entries,start);
    let roster=pick(session,['roster','raiders','players','participants','members'])??pick(root,['roster','raiders','players','participants','members']);
    if(isObj(roster))roster=Object.keys(roster);
    if(!Array.isArray(roster))roster=[];
    roster=roster.map(x=>isObj(x)?extractName(x,['name','player','character','fullName']):str(x)).filter(Boolean);
    const players=[...new Set([...roster,...entries.map(e=>e.winner).filter(Boolean),...softRes.map(e=>e.raider).filter(Boolean),...rollEvents.flatMap(e=>e.rolls.map(r=>r.player))])];
    return {id:`${source.id}:${rawId}:${i}`,sourceId:source.id,sourceName:source.name,rawId,name,start,end,
      guild:extractName(session,['guild','guildName'])||extractName(root,['guild','guildName']),
      difficulty:extractName(session,['difficulty','raidDifficulty']),
      entries,softRes,rollEvents,players,raw:session,schema:extractName(root,['schema','format','schemaVersion','version'])||'Unknown',
    };
  });
}
export function assemble(sources) {
  const unique=[...new Map(sources.filter(s=>isObj(s)&&isObj(s.payload)).map(s=>[s.id,s])).values()];
  const sessions=unique.flatMap(normalizeSource).sort((a,b)=>((b.start||'').localeCompare(a.start||''))||a.name.localeCompare(b.name));
  const allEntries=sessions.flatMap(session=>session.entries.map(entry=>({...entry,sessionId:session.id,sessionName:session.name,sessionStart:session.start})));
  const allRolls=sessions.flatMap(session=>session.rollEvents.flatMap(round=>round.rolls.map(r=>({...r,roundId:round.id,sessionId:session.id,sessionName:session.name,sessionStart:session.start}))));
  const playerMap=new Map();
  for (const session of sessions){
    for (const name of session.players) {
      const key=name.toLowerCase();let p=playerMap.get(key);
      if(!p){p={name,sessionIds:new Set(),awards:[],reserves:[],rolls:[]};playerMap.set(key,p);}
      p.sessionIds.add(session.id);
    }
    for(const entry of session.entries){
      if(!entry.winner)continue;const key=entry.winner.toLowerCase();let p=playerMap.get(key);
      if(!p){p={name:entry.winner,sessionIds:new Set(),awards:[],reserves:[],rolls:[]};playerMap.set(key,p);}
      p.sessionIds.add(session.id);p.awards.push({...entry,sessionId:session.id,sessionName:session.name});
    }
    for(const entry of session.softRes){const key=entry.raider.toLowerCase();let p=playerMap.get(key);
      if(!p){p={name:entry.raider,sessionIds:new Set(),awards:[],reserves:[],rolls:[]};playerMap.set(key,p);}
      p.sessionIds.add(session.id);p.reserves.push({...entry,sessionId:session.id});
    }
  }
  for(const roll of allRolls){
    const key=roll.player.toLowerCase();let p=playerMap.get(key);
    if(!p){p={name:roll.player,sessionIds:new Set(),awards:[],reserves:[],rolls:[]};playerMap.set(key,p);}
    p.sessionIds.add(roll.sessionId);p.rolls.push(roll);
  }
  return {sources:unique,sessions,entries:allEntries,rolls:allRolls,players:[...playerMap.values()].sort((a,b)=>b.awards.length-a.awards.length||a.name.localeCompare(b.name))};
}
export function publishedArchive(sources){return {format:ARCHIVE_FORMAT,generatedAt:new Date().toISOString(),sources:sources.map(s=>({id:s.id,name:s.name,importedAt:s.importedAt,payload:s.payload}))};}
