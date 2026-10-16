/** FATE Armory v1: deterministic, pure projection of PlusOne normalized sessions.
 * Original session exports remain authoritative. Output is never hand-edited.
 */
import { hashText, rollSummary, gearSlotNames } from './parser.js';
const norm = v => String(v ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US');
const toId = (kind, v) => `${kind}-${hashText(String(v))}`;
const iso = v => v || '';
const safeItem = v => v ? {
  id:Number.isSafeInteger(Number(v.id)) && Number(v.id)>0?Number(v.id):null,
  name:String(v.name||''),quality:Number.isInteger(v.quality)?v.quality:null,
  icon: typeof v.icon==='string'?v.icon:'',link:v.link||'',
  displayId:Number.isSafeInteger(Number(v.displayId))&&Number(v.displayId)>0?Number(v.displayId):null,count:Number(v.count)||1
}: null;
const itemKey = v => v?.id?`id:${v.id}`:`name:${norm(v?.name)}`;
const showItem = v => !!v && (v.id || (v.name && v.name!=='Unknown item'));
function shownMode(mode,raw,lootSystem){const system=String(lootSystem||'').toUpperCase();const choice=String(raw||'').toUpperCase().replace(/[\s_-]/g,'');if(system.includes('GROUP')||system.includes('DUNGEON')){if(choice==='NEED')return 'Need';if(choice==='GREED')return 'Greed';if(choice==='PASS')return 'Pass';}return mode;}
function keptRoll(r,lootSystem){return {player:r.player,item:safeItem(r.item),mode:shownMode(r.mode,r.raw?.choice||r.raw?.category||r.raw?.vote||r.mode,lootSystem),value:r.value,max:r.max,status:r.status,won:r.won,
   attempt:r.attempt,contestId:r.contestId||'',roundId:r.roundId||'',boss:r.boss||'',date:r.timestamp||'',voteMethod:r.voteMethod||'',source:r.source||''};}
function keptAward(e,lootSystem){return {id:String(e.id||''),item:safeItem(e.item),winner:e.winner||'',mode:shownMode(e.mode,e.raw?.response||e.raw?.category||e.mode,lootSystem),date:e.timestamp||'',boss:e.boss||'',
  quantity:e.quantity||1,contestId:e.contestId||'',roundId:e.roundId||'',plusOneBefore:e.raw?.plusOneBefore??null,plusOneAfter:e.raw?.plusOneAfter??null};}
function keptReserve(r){return {raider:r.raider,item:safeItem(r.item),consumed:!!r.consumed,consumedAt:r.consumedAt||'',awardRecipient:r.awardRecipient||''};}
function keptGear(g){return g?{capturedAt:g.capturedAt||'',captureMethod:g.captureMethod||'',equippedCount:g.equippedCount,
 playerGUID:g.playerGUID||'',slots:g.slots.map(s=>({slot:s.slot,label:s.label,empty:s.empty,item:safeItem(s.item)}))}:null;}
function compareGear(prev,next){
  if(!prev)return {initial:true,changes:[]};
  const changes=[];
  for(let slot=1;slot<=19;slot++){
    const a=prev.slots[slot-1]?.item, b=next.slots[slot-1]?.item;
    const key=v=>v?`${v.id||norm(v.name)}:${v.link||''}`:'empty';
    if(key(a)!==key(b))changes.push({slot,label:gearSlotNames[slot-1],from:a,to:b});
  }
  return {initial:false,changes};
}
const dateSort=(a,b)=>iso(a.date||a.start||a.capturedAt).localeCompare(iso(b.date||b.start||b.capturedAt));
/** Returns JSON-ready indexes. No giant in-browser session normalization required. */
export function createCatalog(data, {generatedAt='', overrides={}}={}) {
  const rawSessions=[...data.sessions].sort((a,b)=>iso(a.start).localeCompare(iso(b.start))||a.id.localeCompare(b.id));
  const guidNames=new Map(), nameGUIDs=new Map();
  const trustedGUID=v=>{const g=String(v||'').trim();return g&&!/^synthetic[-:]/i.test(g)&&!/^(unknown|null|none)$/i.test(g)?g:'';};
  for(const s of rawSessions)for(const m of s.members){
    const g=trustedGUID(m.gear?.playerGUID || m.roster?.playerGUID);if(!g)continue;
    const n=norm(m.name);if(!nameGUIDs.has(n))nameGUIDs.set(n,new Set());nameGUIDs.get(n).add(g);
    if(!guidNames.has(g))guidNames.set(g,new Set());guidNames.get(g).add(n);
  }
  const identityKey=(name,s)=>{
    const member=s.members.find(m=>norm(m.name)===norm(name) || norm(m.key)===norm(name));
    const own=trustedGUID(member?.gear?.playerGUID || member?.roster?.playerGUID);
    if(own)return 'guid:'+own;
    const candidates=nameGUIDs.get(norm(name));
    if(candidates?.size===1)return 'guid:'+[...candidates][0];
    // Ambiguous same-name records without GUID remain separate instead of guessing.
    if(candidates?.size>1)return 'unverified:'+norm(name)+':'+s.id;
    return 'name:'+norm(name);
  };
  const chars=new Map(), sessionRecords=[], items=new Map(), counts={awards:0,rolls:0,reserves:0,gear:0};
  function player(name,s){
    if(!String(name||'').trim())return null;
    const key=identityKey(name,s);let p=chars.get(key);
    if(!p){p={id:toId('char',key),key,name:String(name).trim(),aliases:[],guid:key.startsWith('guid:')?key.slice(5):'',class:'Unknown',race:'Unknown',characterSex:'Unknown',raceID:null,characterSexID:null,appearance:{},
      sessionCount:0,awardCount:0,rollCount:0,rollWins:0,reserveCount:0,latestRole:'Unknown',lastSeen:'',latestGear:null,
      currentEquipmentDate:'',sessions:[],awards:[],rolls:[],reserves:[],gearHistory:[],plusOnes:[]};chars.set(key,p);}
    if(!p.aliases.includes(String(name).trim()))p.aliases.push(String(name).trim());
    if(iso(s.start)>iso(p.lastSeen)||(iso(s.start)===iso(p.lastSeen)&&p.name===p.name.toLowerCase()&&String(name).trim()!==String(name).trim().toLowerCase())){p.name=String(name).trim();p.lastSeen=iso(s.start);}
    return p;
  }
  function addItem(item,kind,record){
    if(!showItem(item))return;
    const key=itemKey(item);let it=items.get(key);
    if(!it){it={key,id:item.id,name:item.name,quality:item.quality,icon:item.icon||'',displayId:item.displayId||null,aliases:[],awards:[],rolls:[],reserves:[],equippedBy:[],seenIn:[]};items.set(key,it);}
    if(item.name && !it.aliases.includes(item.name))it.aliases.push(item.name);
    if(item.icon&&!it.icon)it.icon=item.icon;
    if(item.displayId&&!it.displayId)it.displayId=item.displayId;
    if(item.quality!==null&&it.quality===null)it.quality=item.quality;
    if(kind==='seen'){if(!it.seenIn.includes(record))it.seenIn.push(record);}else it[kind].push(record);
  }
  for(const s of rawSessions){
    const sid=toId('session',s.id);
    const ses={id:sid,sourceId:s.sourceId||'',sourceName:s.sourceName||'',originalId:s.id,name:s.name||'Unnamed session',
      start:s.start||'',end:s.end||'',guild:s.guild||'',difficulty:s.difficulty||'',schema:s.schema||'',lootSystem:s.lootSystem||'Unknown',
      players:[],members:[],awards:[],rolls:[],reserves:[],contests:[],gearCount:s.gearCount||0,plusOnes:s.plusOnes||{}};
    const seen=new Set();
    const members=new Map(s.members.map(m=>[norm(m.name),m]));
    for(const name of s.players){const p=player(name,s);if(!p)continue;
      if(!seen.has(p.id)){p.sessions.push({id:sid,name:ses.name,date:ses.start,role:'Unknown',hasGear:false,awards:0,rolls:0});seen.add(p.id);}
      ses.players.push({id:p.id,name});
    }
    for(const m of s.members){const p=player(m.name,s);if(!p)continue;
      for(const field of ['class','race','characterSex'])if(m[field]&&m[field]!=='Unknown')p[field]=m[field];
      if(m.raceID!=null)p.raceID=m.raceID;
      if(m.characterSexID!=null)p.characterSexID=m.characterSexID;
      if(m.appearance&&Object.keys(m.appearance).length)p.appearance={...p.appearance,...m.appearance};
      if(iso(s.start)>=iso(p.lastSeen) && m.role!=='Unknown')p.latestRole=m.role;
      const presence=p.sessions.find(x=>x.id===sid);if(presence){presence.role=m.role||'Unknown';presence.hasGear=!!m.gear;}
      ses.members.push({id:p.id,key:m.key,name:m.name,class:m.class,race:m.race,characterSex:m.characterSex,raceID:m.raceID,characterSexID:m.characterSexID,appearance:m.appearance,role:m.role,
        gear:keptGear(m.gear)});
      if(m.gear){counts.gear++;const gear=keptGear(m.gear);
        p.gearHistory.push({sessionId:sid,sessionName:ses.name,date:ses.start,capturedAt:gear.capturedAt||ses.start,gear});
        for(const slot of gear.slots)if(slot.item)addItem(slot.item,'seen',sid);
      }
    }
    for(const e of s.entries){const award=keptAward(e,s.lootSystem);award.sessionId=sid;award.sessionName=ses.name;award.sessionDate=ses.start;
      const p=player(e.winner,s);if(p){award.characterId=p.id;p.awards.push(award);const presence=p.sessions.find(x=>x.id===sid);if(presence)presence.awards++;}
      ses.awards.push(award);counts.awards++;addItem(award.item,'awards',{characterId:p?.id||'',name:e.winner,date:award.date||ses.start,sessionId:sid,sessionName:ses.name,mode:award.mode,quantity:award.quantity,roll: e.raw?.roll??null});
    }
    for(const round of s.rollEvents){
      const contest= {id:round.contestId||round.id,roundId:round.id,item:safeItem(round.item),winner:round.winner||'',date:round.timestamp||'',
         tied:round.tied,disposition:round.disposition||'',boss:round.boss||'',rolls:[]};
      for(const r of round.rolls){const roll=keptRoll(r,s.lootSystem);roll.contestId=contest.id;roll.sessionId=sid;roll.sessionName=ses.name;roll.sessionDate=ses.start;
        const p=player(r.player,s);if(p){roll.characterId=p.id;p.rolls.push(roll);const presence=p.sessions.find(x=>x.id===sid);if(presence)presence.rolls++;}
        contest.rolls.push(roll);ses.rolls.push(roll);counts.rolls++;
        addItem(roll.item,'rolls',{characterId:p?.id||'',name:r.player,value:r.value,max:r.max,mode:r.mode,won:r.won,status:r.status,date:roll.date||ses.start,sessionId:sid,sessionName:ses.name});
      }
      ses.contests.push(contest);
    }
    for(const r of s.softRes){const reserve=keptReserve(r);reserve.sessionId=sid;reserve.sessionName=ses.name;reserve.sessionDate=ses.start;
      const p=player(r.raider,s);if(p){reserve.characterId=p.id;p.reserves.push(reserve);}
      ses.reserves.push(reserve);counts.reserves++;
      addItem(reserve.item,'reserves',{characterId:p?.id||'',name:r.raider,consumed:reserve.consumed,date:ses.start,sessionId:sid,sessionName:ses.name});
    }
    for(const [name,value] of Object.entries(s.plusOnes||{})){const p=player(name,s);if(p && Number.isFinite(Number(value)))p.plusOnes.push({sessionId:sid,date:ses.start,value:Number(value)});}
    ses.players=[...new Map(ses.players.map(p=>[p.id,p])).values()];
    sessionRecords.push(ses);
  }
  const characterRecords=[];
  for(const p of chars.values()){
    p.sessions.sort((a,b)=>iso(b.date).localeCompare(iso(a.date)));
    p.awards.sort((a,b)=>iso(b.date).localeCompare(iso(a.date)));
    p.rolls.sort((a,b)=>iso(b.date).localeCompare(iso(a.date)));
    p.reserves.sort((a,b)=>iso(b.sessionDate).localeCompare(iso(a.sessionDate)));
    p.plusOnes.sort((a,b)=>iso(b.date).localeCompare(iso(a.date)));
    p.gearHistory.sort((a,b)=>iso(a.capturedAt).localeCompare(iso(b.capturedAt))||iso(a.date).localeCompare(iso(b.date)));
    let previous=null;
    for(const snap of p.gearHistory){const changes=compareGear(previous,snap.gear);snap.initial=changes.initial;snap.changes=changes.changes;previous=snap.gear;}
    p.latestGear=previous;p.currentEquipmentDate=p.gearHistory.at(-1)?.capturedAt||'';
    p.gearHistory.reverse();
    p.sessionCount=p.sessions.length;p.awardCount=p.awards.length;p.rollCount=p.rolls.length;
    p.rollWins=p.rolls.filter(r=>r.value!==null&&r.won===true).length;p.reserveCount=p.reserves.length;
    p.rollModes={};p.awardModes={};p.rollByYear={};
    for(const r of p.rolls){p.rollModes[r.mode]=(p.rollModes[r.mode]||0)+1;const y=r.date?new Date(r.date).getUTCFullYear():'Unknown';p.rollByYear[y]=(p.rollByYear[y]||0)+1;}
    for(const a of p.awards)p.awardModes[a.mode]=(p.awardModes[a.mode]||0)+1;
    const summary=rollSummary(p.rolls);p.averageRoll=summary.avg;p.rollWinRate=summary.winRate;
    characterRecords.push(p);
  }
  characterRecords.sort((a,b)=>a.name.localeCompare(b.name));
  const characterIndex=characterRecords.map(p=>({id:p.id,name:p.name,aliases:p.aliases,class:p.class,race:p.race,characterSex:p.characterSex,
    lastSeen:p.lastSeen,latestRole:p.latestRole,sessionCount:p.sessionCount,awardCount:p.awardCount,rollCount:p.rollCount,rollWins:p.rollWins,
    averageRoll:p.averageRoll,rollWinRate:p.rollWinRate,reserveCount:p.reserveCount,gearCount:p.gearHistory.length,
    currentEquipmentDate:p.currentEquipmentDate,gearPreview:(p.latestGear?.slots||[]).filter(x=>x.item).slice(0,7).map(s=>({slot:s.slot,item:s.item}))}));
  const itemRecords=[...items.values()].map(it=>{
    const override=overrides?.[String(it.id)]||null;
    it.slug=toId('item',it.key);
    if(override){if(override.icon)it.icon=String(override.icon);if(override.name)it.name=String(override.name);if(Number.isInteger(override.quality))it.quality=override.quality;if(Number.isSafeInteger(override.displayId)&&override.displayId>0)it.displayId=override.displayId;}
    it.awards.sort(dateSort);it.rolls.sort(dateSort);it.reserves.sort(dateSort);
    it.awardCount=it.awards.length;it.winnerCount=new Set(it.awards.map(a=>a.characterId)).size;it.rollCount=it.rolls.length;it.reserveCount=it.reserves.length;
    return it;
  }).sort((a,b)=>a.name.localeCompare(b.name));
  const itemIndex=itemRecords.map(({key,slug,id,name,quality,icon,displayId,awardCount,winnerCount,rollCount,reserveCount,aliases})=>({key,slug,id,name,quality,icon,displayId,awardCount,winnerCount,rollCount,reserveCount,aliases}));
  const sessIndex=sessionRecords.map(s=>({id:s.id,name:s.name,start:s.start,end:s.end,originalId:s.originalId,sourceName:s.sourceName,
    playerCount:s.players.length,awardCount:s.awards.length,rollCount:s.rolls.length,reserveCount:s.reserves.length,gearCount:s.gearCount}))
     .sort((a,b)=>iso(b.start).localeCompare(iso(a.start)));
  const recentAwards=sessionRecords.flatMap(s=>s.awards).sort((a,b)=>iso(b.date).localeCompare(iso(a.date))).slice(0,16);
  const recentSessions=sessIndex.slice(0,8);
  const rollTotals=characterRecords.flatMap(p=>p.rolls);
  const guildRoll=rollSummary(rollTotals);
  const histogram=Array(10).fill(0);
  for(const r of rollTotals)if(r.value!==null && Number(r.max)>0)histogram[Math.min(9,Math.max(0,Math.ceil(10*Number(r.value)/Number(r.max))-1))]++;
  const recentRolls=rollTotals.slice().sort((a,b)=>iso(b.date).localeCompare(iso(a.date))).slice(0,500);
  const rollReport={generatedAt,total:rollTotals.length,summary:guildRoll,histogram,recentRolls};
  const rollLeaders=[...characterIndex].filter(p=>p.rollCount).sort((a,b)=>b.rollCount-a.rollCount).slice(0,12);
  return {version:1,generatedAt,rollReport,characters:characterRecords,characterIndex,itemRecords,itemIndex,sessionRecords,sessIndex,
    overview:{version:1,generatedAt,counts:{characters:characterRecords.length,sessions:sessionRecords.length,...counts,items:itemRecords.length},recentAwards,recentSessions,rollLeaders,guildRoll},
    manifest:{version:1,generatedAt,paths:{characters:'data/characters/',sessions:'data/sessions/',items:'data/items/'},
      counts:{characters:characterRecords.length,sessions:sessionRecords.length,items:itemRecords.length},sourceCount:data.sources?.length||0}};
}
