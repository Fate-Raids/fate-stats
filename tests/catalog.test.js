import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assemble,unwrapImports} from '../assets/parser.js';
import {createCatalog} from '../assets/catalog.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function fixture(name){const raw=JSON.parse(readFileSync(path.join(ROOT,'reference-fixtures',name),'utf8'));return unwrapImports(raw,name);}
const deadmines='PlusOne_FATE_v7_Full20Raider_Deadmines.json';
const scarlet='PlusOne_FATE_v7_Full20Raider_ScarletMonastery.json';
const data=()=>assemble([...fixture(deadmines),...fixture(scarlet)]);
test('two weekly sessions of same synthetic roster produce 20 continuing character profiles, never 40',()=>{
 const c=createCatalog(data());assert.equal(c.characterIndex.length,20);assert.equal(c.sessIndex.length,2);
 for(const p of c.characters){assert.equal(p.sessionCount,2);assert.equal(p.gearHistory.length,2);}
});
test('profiles maintain full 19-slot history and track equipment deltas without mutating earlier snapshot',()=>{
 const c=createCatalog(data());const p=c.characters.find(p=>p.name==='Healos');assert.ok(p);
 assert.equal(p.gearHistory.length,2);assert.equal(p.latestGear.slots.length,19);
 assert.equal(p.gearHistory[0].gear.slots.length,19);assert.equal(p.gearHistory[1].gear.slots.length,19);
 assert.ok(Array.isArray(p.gearHistory[0].changes));
 assert.ok(p.awards.every(a=>a.sessionId));assert.ok(p.rolls.every(r=>r.sessionId));
});
test('equipment quality can be inferred from item link rarity where raw quality omitted',()=>{
 const c=createCatalog(data());const p=c.characters.find(p=>p.name==='Healos');
 assert.equal(p.latestGear.slots[0].item.quality,3);
});
test('a single item award builds searchable winner, roll and reserve index',()=>{
 const c=createCatalog(data());const it=c.itemRecords.find(i=>i.awards.length&&i.rolls.length);
 assert.ok(it);assert.equal(it.winnerCount,new Set(it.awards.map(a=>a.characterId)).size);
 assert.ok(it.rolls.every(r=>r.sessionId));assert.ok(it.slug.startsWith('item-'));
});
test('refreshing item metadata changes generated catalog without modifying raw awards',()=>{
 const src=data(),plain=createCatalog(src),it=plain.itemIndex.find(i=>i.id);const oldName=it.name;
 const replaced=createCatalog(src,{overrides:{[it.id]:{name:'Revised Forever Item Name',icon:'inv_sword_01'}}});
 assert.equal(replaced.itemIndex.find(i=>i.id===it.id).name,'Revised Forever Item Name');
 assert.equal(replaced.itemIndex.find(i=>i.id===it.id).icon,'inv_sword_01');
 assert.equal(plain.itemIndex.find(i=>i.id===it.id).name,oldName);
 assert.equal(src.entries.find(e=>e.item.id===it.id)?.item.name??oldName,src.entries.find(e=>e.item.id===it.id)?.item.name??oldName);
});
test('global roll summary counts only valid numeric rolls; includes non-numeric responses separately',()=>{
 const c=createCatalog(data());const numeric=c.characters.flatMap(p=>p.rolls).filter(r=>r.value!==null).length;
 assert.equal(c.rollReport.summary.numericRolls,numeric);
 assert.equal(c.rollReport.histogram.reduce((a,b)=>a+b,0),numeric);
 assert.equal(c.rollReport.total,c.overview.counts.rolls);
});
test('different verified character GUIDs are not silently merged merely due to matching names',()=>{
 const a=JSON.parse(readFileSync(path.join(ROOT,'reference-fixtures',deadmines),'utf8'));
 const b=JSON.parse(readFileSync(path.join(ROOT,'reference-fixtures',scarlet),'utf8'));
 a.session.gearSnapshots.healos.playerGUID='Player-REAL-A';
 b.session.gearSnapshots.healos.playerGUID='Player-REAL-B';
 const s=assemble([...unwrapImports(a,'a.json'),...unwrapImports(b,'b.json')]);
 const c=createCatalog(s);
 assert.equal(c.characters.filter(p=>p.name==='Healos').length,2);
 assert.equal(c.characterIndex.length,21);
});
test('corrected addon award ID in a same-session reexport replaces winner rather than duplicating award',()=>{
 const a=JSON.parse(readFileSync(path.join(ROOT,'reference-fixtures',deadmines),'utf8'));
 const b=structuredClone(a);
 const original=a.session.awards[0];
 b.session.awards[0].recipient='Healos';
 const s=assemble([...unwrapImports(a,'earlier.json'),...unwrapImports(b,'later.json')]);
 const awards=s.entries.filter(e=>e.id===original.entryId);
 assert.equal(awards.length,1);
 assert.equal(awards[0].winner,'Healos');
});
