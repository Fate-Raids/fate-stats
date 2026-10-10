/* Generated classic-script adapter from parser.js. No ES module/CORS requirement. */
(function(){
'use strict';
/* PlusOne Raid Archive: flexible adapter for current and future JSON exports.
 * No original export fields are discarded; the raw JSON stays in each source archive.
 */
const ARCHIVE_FORMAT = 'plusone-web-archive-v1';
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

function hashText(text) {
  let a = 2166136261, b = 2166136261;
  for (let i=0;i<text.length;i++) { const c=text.charCodeAt(i); a=Math.imul(a^c, 16777619); b=Math.imul(b^(c+(i&255)),16777619); }
  return `${(a>>>0).toString(36)}${(b>>>0).toString(36)}${text.length.toString(36)}`;
}
function makeSource(payload, filename='raid-export.json') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw Error('Expected a JSON object. Import a PlusOne session export or a site archive.');
  const id = hashText(JSON.stringify(payload));
  return { id, name:String(filename).slice(0,180), importedAt:new Date().toISOString(), payload };
}
function isArchive(obj) {return isObj(obj) && obj.format===ARCHIVE_FORMAT && Array.isArray(obj.sources);}
function unwrapImports(payload, filename) {
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
function normalizeMode(raw){
  const t=str(raw).trim().toLowerCase().replace(/[\s_-]/g,'');
  if(['main','ms','mainspec','need','1','primary'].includes(t)) return 'Main Spec';
  if(['off','os','offspec','greed','2','secondary'].includes(t)) return 'Off Spec';
  if(['tmog','transmog','mog','appearance','3'].includes(t)) return 'Transmog';
  if(['softres','softreserve','sr','reserved','5'].includes(t))return 'Soft Res';
  if(['pass','passed','declined','0','4'].includes(t))return 'Pass';
  if(['disenchant','de','disenchanting'].includes(t))return 'Disenchant';
  return str(raw).trim() || 'Unspecified';
}
function extractEntry(rec,i,sessionStart) {
  const item=parseItem(rec);
  let winner=extractName(rec,playerKeys);
  for(const key of ['award','result','distribution','outcome']) {
    if(!winner && isObj(rec[key])) winner=extractName(rec[key],playerKeys);
  }
  const rawMode=pick(rec,['response','rollType','spec','category','choice','vote','awardType','reason']) || (isObj(rec.award)?pick(rec.award,typeKeys):undefined) || pick(rec,['lootType','mode']);
  const timestamp=findDate(rec,['timestamp','awardedAt','time','date','createdAt','completedAt']);
  return {
    id: str(pick(rec,['entryId','awardId','lootId','guid','id']))||String(i+1),
    item,
    winner:winner.trim(),mode:normalizeMode(rawMode),
    timestamp:timestamp||sessionStart, boss:extractName(rec,['boss','bossName','encounter','encounterName','source']),
    quantity:item.count,contestId:str(pick(rec,['contestId','roundId'])),roundId:str(pick(rec,['roundId'])),
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
      for(let j=0;j<Math.min(100,Math.max(1,Number.isFinite(count)?count:1));j++)out.push({raider:name||extractName(item,['raider','player','name']),item:p,consumed:item.consumed===true,consumedAt:readDate(item.consumedAt),awardRecipient:str(item.awardRecipient),raw:item});
    }else if(typeof item==='string' || typeof item==='number') {
      out.push({raider:name,item:parseItem({item:typeof item==='number'?{itemId:item}:item}),consumed:false,raw:item});
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
  const item=parseItem(event.item!==undefined||event.itemId!==undefined||event.itemID!==undefined||event.itemLink!==undefined?event:(award||event));
  const tied=event.disposition==='TIE_REROLL'||event.tied===true;
  const winner=tied?'':(extractName(event,['winner','winnerName','awardedTo','recipient'])||award?.winner||'');
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
    const timedOut=rawOutcome==='timeout'||rawOutcome==='timed-out';
    const explicitWon=pick(o,['won','isWinner']);
    const laterWinnerAttempt=participants.slice(j+1).some(next=>isObj(next)&&extractName(next,['player','playerName','raider','name','character','unit']).toLowerCase()===player.toLowerCase());
    const won=tied?null:(typeof explicitWon==='boolean'?explicitWon:(!!winner && winner.toLowerCase()===player.toLowerCase()&&!passed&&!laterWinnerAttempt));
    const resolved=pick(event,['resolved','finalized'])===true||!!winner||rawOutcome==='lost'||rawOutcome==='won';
    return {id:`${eventId}:${j}`,eventId,player,mode,value,max,
      status:timedOut?'timeout':passed?'passed':value!==null?'rolled':'choice-only',
      won:tied?null:resolved?won:null,timestamp:findDate(o,['timestamp','time'])||timestamp,item,boss:extractName(event,['boss','bossName','encounter','encounterName'])||award?.boss||'',winner,
      attempt:Number(pick(o,['attempt'])||1), voteMethod:str(pick(o,['voteMethod'])||pick(event,['voteMethod'])),
      source:str(pick(o,['source'])), raw:o};
  }).filter(Boolean);
  const contestId=str(pick(event,['contestId']))||eventId;
  return {id:eventId,contestId,tiebreakerRound:Number(pick(event,['tiebreakerRound'])||0),
    tied, tiePlayers:Array.isArray(event.tiePlayers)?event.tiePlayers.map(str):[],
    disposition:str(pick(event,['disposition'])),kind:str(pick(event,['kind'])),
    item,winner,timestamp,boss:rows[0]?.boss||'',rolls:rows,raw:event};
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
function rollSummary(rows){
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

// The Master stores stable normalized NameKey map keys. Display labels come
// from record.name/player; never substitute those internal lowercase keys.
const sexNames={0:'Male',1:'Female',2:'None',3:'Both',4:'Neutral'};
const nameKey=s=>str(s).trim().toLocaleLowerCase('en-US');
const gearSlotNames=['Head','Neck','Shoulder','Shirt','Chest','Waist','Legs','Feet','Wrist','Hands','Finger 1','Finger 2','Trinket 1','Trinket 2','Back','Main Hand','Off Hand','Ranged / Relic','Tabard'];

function characterIdentity(roster={}, snapshot={}) {
  const joined={...roster,...Object.fromEntries(Object.entries(snapshot||{}).filter(([,v])=>v!==undefined && v!==null && v!==''))};
  const sexId=joined.characterSexID;
  const sex=Number.isInteger(sexId) && Object.hasOwn(sexNames,sexId)?sexNames[sexId]:
    ['Male','Female','None','Both','Neutral'].includes(joined.characterSex)?joined.characterSex:'Unknown';
  return {role:str(joined.role)||'Unknown',class:str(joined.className||joined.class)||'Unknown',classToken:str(joined.class),
    race:str(joined.race||joined.raceToken)||'Unknown',raceToken:str(joined.raceToken||joined.race),
    characterSex:sex,characterSexID:Number.isInteger(sexId)?sexId:null};
}
function rosterAndGear(session,root) {
  const rosterRaw=isObj(session.roster)?session.roster:isObj(root.roster)?root.roster:{};
  const gearRaw=isObj(session.gearSnapshots)?session.gearSnapshots:isObj(root.gearSnapshots)?root.gearSnapshots:{};
  const records=new Map();
  const put=(key,obj,kind)=>{
    const ident=nameKey(key);if(!ident)return;
    const before=records.get(ident)||{key:ident,name:'',roster:{},snapshot:null};
    const next={...before};
    if(kind==='roster')next.roster=isObj(obj)?obj:{name:str(obj)};
    else if(isObj(obj))next.snapshot=obj;
    next.name=str(next.roster?.name||next.roster?.display||next.snapshot?.player||key);
    records.set(ident,next);
  };
  for(const [key,obj] of Object.entries(rosterRaw))put(key,obj,'roster');
  for(const [key,obj] of Object.entries(gearRaw))put(key,obj,'snapshot');
  // Preserve older rosters represented as arrays.
  const arr=Array.isArray(session.roster)?session.roster:Array.isArray(root.roster)?root.roster:[];
  for(const entry of arr){const name=isObj(entry)?str(entry.name||entry.display):str(entry);if(name)put(name,entry,'roster');}
  const result=[...records.values()].map(record=>{
    const gear=record.snapshot;
    const occupied=new Map(Array.isArray(gear?.slots)?gear.slots.filter(v=>isObj(v)&&Number.isInteger(v.slot)&&v.slot>=1&&v.slot<=19).map(v=>[v.slot,v]):[]);
    const slots=gear?gearSlotNames.map((label,i)=>{const slot=i+1;const raw=occupied.get(slot)||{slot,empty:true};
      const item=raw.empty===false?parseItem(raw):null;
      return {slot,label,empty:raw.empty!==false,item,raw};}):[];
    const identity=characterIdentity(record.roster,gear);
    return {...record,...identity,gear:gear?{capturedAt:readDate(gear.capturedAt),captureMethod:str(gear.captureMethod),
       equippedCount:Number.isInteger(gear.equippedCount)?gear.equippedCount:slots.filter(v=>!v.empty).length,
       playerGUID:str(gear.playerGUID),slots,raw:gear}:null};
  });
  return {members:result.sort((a,b)=>a.name.localeCompare(b.name)),byKey:new Map(result.map(m=>[m.key,m]))};
}
function rollContests(rounds,entries){
  const groups=new Map();
  for(const round of rounds){const key=round.contestId||round.id;let group=groups.get(key);
    if(!group){group={id:key,rounds:[],item:round.item,winner:'',award:null};groups.set(key,group);}
    group.rounds.push(round);if(round.winner&&!round.tied)group.winner=round.winner;
  }
  for(const entry of entries){const key=entry.contestId||entry.roundId;
    let group=groups.get(key) || [...groups.values()].find(g=>g.rounds.some(r=>r.id===key));
    if(group&&!group.award){group.award=entry;group.winner=entry.winner||group.winner;}
  }
  for(const group of groups.values())group.rounds.sort((a,b)=>a.tiebreakerRound-b.tiebreakerRound||(a.timestamp||'').localeCompare(b.timestamp||''));
  return [...groups.values()];
}
function stableSessionId(session,rawId,start,name,source,i){
  if(!rawId||rawId===String(i+1)&&!pick(session,['id','sessionId','sessionID','raidId','raidID','guid']))return `${source.id}:${i}`;
  return `session:${rawId.length>4?rawId:`${rawId}:${start}:${name}`}`;
}
function mergeNewSession(old,latest){
  const mergeBy=(left,right,key)=>{
    const map=new Map();for(const v of [...left,...right])map.set(key(v),v);return [...map.values()];
  };
  const richest=(a,b)=>({...(a||{}),...(b||{})});
  const members=mergeBy(old.members||[],latest.members||[],m=>m.key).map(m=>{
    const first=(old.members||[]).find(x=>x.key===m.key),second=(latest.members||[]).find(x=>x.key===m.key);
    if(!first||!second)return m;
    const gear=first.gear&&second.gear?(first.gear.capturedAt>second.gear.capturedAt?first.gear:second.gear):first.gear||second.gear;
    const identity=characterIdentity(first.roster,second.snapshot||first.snapshot||{});
    return {...first,...second,...identity,roster:richest(first.roster,second.roster),snapshot:second.snapshot||first.snapshot,gear};
  });
  const entries=mergeBy(old.entries,latest.entries,(e,i)=>String(e.id||'')+':'+str(e.timestamp)+':'+str(e.item?.id)+':'+nameKey(e.winner));
  const rollEvents=mergeBy(old.rollEvents,latest.rollEvents,e=>e.id);
  const softRes=latest.softRes.length?latest.softRes:old.softRes;
  const plusOnes={...old.plusOnes,...latest.plusOnes};
  return {...old,...latest,entries,rollEvents,contests:rollContests(rollEvents,entries),softRes,plusOnes,members,gearCount:members.filter(m=>m.gear).length,
    players:[...new Set([...old.players,...latest.players,...members.map(m=>m.name)])],raw:latest.raw};
}
function normalizeSource(source) {
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
    const rosterGear=rosterAndGear(session,root);
    let legacyRoster=pick(session,['raiders','players','participants','members'])??pick(root,['raiders','players','participants','members']);
    if(isObj(legacyRoster))legacyRoster=Object.values(legacyRoster);
    if(!Array.isArray(legacyRoster))legacyRoster=[];
    legacyRoster=legacyRoster.map(x=>isObj(x)?extractName(x,['name','player','character','fullName']):str(x)).filter(Boolean);
    const players=[...new Set([...rosterGear.members.map(x=>x.name),...legacyRoster,...entries.map(e=>e.winner).filter(Boolean),...softRes.map(e=>e.raider).filter(Boolean),...rollEvents.flatMap(e=>e.rolls.map(r=>r.player))])];
    return {id:stableSessionId(session,rawId,start,name,source,i),sourceId:source.id,sourceName:source.name,rawId,name,start,end,
      guild:extractName(session,['guild','guildName'])||extractName(root,['guild','guildName']),
      difficulty:extractName(session,['difficulty','raidDifficulty']),
      entries,softRes,rollEvents,contests:rollContests(rollEvents,entries),members:rosterGear.members,plusOnes:isObj(session.plusOnes)?session.plusOnes:{},
      gearCount:rosterGear.members.filter(m=>m.gear).length,players,raw:session,schema:extractName(root,['schema','format','schemaVersion','version'])||'Unknown',
    };
  });
}
function assemble(sources) {
  const unique=[...new Map(sources.filter(s=>isObj(s)&&isObj(s.payload)).map(s=>[s.id,s])).values()];
  const sessionMap=new Map();
  for(const session of unique.flatMap(normalizeSource)){
    const previous=sessionMap.get(session.id);sessionMap.set(session.id,previous?mergeNewSession(previous,session):session);
  }
  const sessions=[...sessionMap.values()].sort((a,b)=>((b.start||'').localeCompare(a.start||''))||a.name.localeCompare(b.name));
  const allEntries=sessions.flatMap(session=>session.entries.map(entry=>({...entry,sessionId:session.id,sessionName:session.name,sessionStart:session.start})));
  const allRolls=sessions.flatMap(session=>session.rollEvents.flatMap(round=>round.rolls.map(r=>({...r,roundId:round.id,sessionId:session.id,sessionName:session.name,sessionStart:session.start}))));
  const playerMap=new Map();
  for (const session of sessions){
    for (const name of session.players) {
      const key=name.toLowerCase();let p=playerMap.get(key);
      if(!p){p={name,sessionIds:new Set(),awards:[],reserves:[],rolls:[],memberRecords:[],plusOnes:[]};playerMap.set(key,p);}
      p.sessionIds.add(session.id);
    }
    for(const member of session.members){const key=nameKey(member.name);const p=playerMap.get(key);if(p)p.memberRecords.push({...member,sessionId:session.id,sessionName:session.name});}
    for(const [key,value] of Object.entries(session.plusOnes||{})){const p=playerMap.get(nameKey(key));if(p&&Number.isInteger(value))p.plusOnes.push({sessionId:session.id,sessionName:session.name,value});}
    for(const entry of session.entries){
      if(!entry.winner)continue;const key=entry.winner.toLowerCase();let p=playerMap.get(key);
      if(!p){p={name:entry.winner,sessionIds:new Set(),awards:[],reserves:[],rolls:[],memberRecords:[],plusOnes:[]};playerMap.set(key,p);}
      p.sessionIds.add(session.id);p.awards.push({...entry,sessionId:session.id,sessionName:session.name});
    }
    for(const entry of session.softRes){const key=entry.raider.toLowerCase();let p=playerMap.get(key);
      if(!p){p={name:entry.raider,sessionIds:new Set(),awards:[],reserves:[],rolls:[],memberRecords:[],plusOnes:[]};playerMap.set(key,p);}
      p.sessionIds.add(session.id);p.reserves.push({...entry,sessionId:session.id});
    }
  }
  for(const roll of allRolls){
    const key=roll.player.toLowerCase();let p=playerMap.get(key);
    if(!p){p={name:roll.player,sessionIds:new Set(),awards:[],reserves:[],rolls:[],memberRecords:[],plusOnes:[]};playerMap.set(key,p);}
    p.sessionIds.add(roll.sessionId);p.rolls.push(roll);
  }
  return {sources:unique,sessions,entries:allEntries,rolls:allRolls,players:[...playerMap.values()].sort((a,b)=>b.awards.length-a.awards.length||a.name.localeCompare(b.name))};
}
function publishedArchive(sources){return {format:ARCHIVE_FORMAT,generatedAt:new Date().toISOString(),sources:sources.map(s=>({id:s.id,name:s.name,importedAt:s.importedAt,payload:s.payload}))};}

window.PlusOneParser={ARCHIVE_FORMAT,hashText,makeSource,isArchive,unwrapImports,normalizeMode,normalizeSource,assemble,publishedArchive,rollSummary};
})();
