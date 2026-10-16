import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSource,assemble,normalizeSource,publishedArchive,unwrapImports,rollSummary} from '../assets/parser.js';
const base=JSON.parse(readFileSync(new URL('../samples/PlusOne_v7_Gear_Rolls_Test.json',import.meta.url),'utf8'));
const build=(o=base)=>assemble([makeSource(o,'sample-v7.json')]);
test('v7 roster uses original character names, not normalized JSON map keys',()=>{
 const a=build(),s=a.sessions[0];
 assert.equal(s.schema,'PlusOneRaidHistory-7');
 assert.deepEqual(s.members.map(m=>m.name),['Healos Animosity','Maddy','Tiger']);
 assert.equal(s.players.length,3);
 assert.ok(a.players.some(p=>p.name==='Healos Animosity'&&p.memberRecords.length===1));
});
test('v7 records both 19-slot snapshots, including empty offhand and male enum zero',()=>{
 const s=build().sessions[0];
 assert.equal(s.members.length,3);assert.equal(s.gearCount,2);
 const heal=s.members.find(x=>x.key==='healos animosity'),tiger=s.members.find(x=>x.key==='tiger');
 assert.equal(heal.characterSex,'Female');assert.equal(heal.race,'Night Elf');assert.equal(heal.gear.slots.length,19);
 assert.equal(heal.gear.slots[6].item.id,253997);
 assert.equal(tiger.characterSex,'Male');assert.equal(tiger.characterSexID,0);assert.equal(tiger.gear.slots.length,19);
 assert.equal(heal.gear.slots.find(x=>x.slot===17).empty,true);
 assert.equal(tiger.gear.slots.find(x=>x.slot===17).empty,false);
 assert.equal(s.members.find(x=>x.name==='Maddy').characterSex,'Unknown');
 assert.equal(s.members.find(x=>x.name==='Maddy').gear,null);
});
test('tie and final reroll form one contest, two windows, one confirmed award',()=>{
 const s=build().sessions[0],c=s.contests.find(c=>c.id==='test:2');
 assert.equal(s.entries.length,2);assert.equal(s.contests.length,2);
 assert.equal(c.rounds.length,2);assert.equal(c.award.winner,'Maddy');
 assert.equal(c.rounds[0].disposition,'TIE_REROLL');assert.equal(c.rounds[0].tied,true);
 assert.deepEqual(c.rounds[0].tiePlayers,['Healos Animosity','Maddy']);
 assert.equal(c.rounds[1].winner,'Maddy');assert.equal(c.rounds[0].rolls.every(r=>r.won===null),true);
 assert.equal(rollSummary(c.rounds.flatMap(r=>r.rolls)).wins,1);
});
test('accepted method, attempt, maximum, null and status pass through without invented values',()=>{
 const s=build().sessions[0],r=s.rollEvents.flatMap(x=>x.rolls);
 assert.ok(r.some(x=>x.voteMethod==='WHISPER'&&x.value===45&&x.max===99));
 assert.ok(r.some(x=>x.voteMethod==='ADDON'&&x.value===61&&x.max===100));
 assert.ok(r.every(x=>x.attempt===1));
 const adapted=structuredClone(base);
 adapted.session.rollEvents[0].rolls.push({player:'Third',category:'Pass',status:'timeout',value:null,max:100,voteMethod:'RAID_ANNOUNCEMENT'});
 const u=build(adapted).rolls.find(x=>x.player==='Third');
 assert.equal(u.value,null);assert.equal(u.status,'timeout');assert.equal(u.voteMethod,'RAID_ANNOUNCEMENT');
});
test('v4/v5/v6 imports retain historical behavior and unknown identity',()=>{
 for(const version of [4,5,6]){
  const payload=structuredClone(base);payload.schema=`PlusOneRaidHistory-${version}`;
  if(version<7){for(const r of Object.values(payload.session.roster))for(const key of ['race','raceToken','raceID','characterSex','characterSexID'])delete r[key];for(const r of Object.values(payload.session.gearSnapshots))for(const key of ['race','raceToken','raceID','characterSex','characterSexID'])delete r[key];}
  if(version<6){delete payload.session.roster;delete payload.session.gearSnapshots;}
  const s=build(payload).sessions[0];assert.equal(s.entries.length,2);
  assert.equal(s.gearCount,version<6?0:2);
  if(version===6)assert.equal(s.members.find(x=>x.name==='Tiger').characterSex,'Unknown');
 }
});
test('upsert same stable session ID merges snapshots without duplicate awards',()=>{
 const older=structuredClone(base);delete older.session.gearSnapshots.tiger;
 const newer=structuredClone(base);newer.session.gearSnapshots.tiger.capturedAt+=200;
 newer.session.rollEvents[0].rolls[0].value=72;
 const db=assemble([makeSource(older,'older.json'),makeSource(newer,'newer.json')]);
 assert.equal(db.sessions.length,1);assert.equal(db.entries.length,2);assert.equal(db.sessions[0].gearCount,2);
 assert.equal(db.rolls.find(r=>r.player==='Healos Animosity'&&r.eventId==='test:1').value,72);
 assert.equal(db.sources.length,2);
 const restored=unwrapImports(publishedArchive(db.sources),'archive.json');
 assert.deepEqual(restored[0].payload,older);assert.deepEqual(restored[1].payload,newer);
});
test('item strings are plain data: no arbitrary HTML can influence outbound URL',()=>{
 const fake=structuredClone(base);fake.session.roster['healos animosity'].name='<img src=x onerror=alert(1)>';
 const slot=fake.session.gearSnapshots['healos animosity'].slots[6];slot.itemID=-12;slot.itemLink='bad text';
 const db=build(fake),s=db.sessions[0];assert.equal(s.members.find(x=>x.key==='healos animosity').name,'<img src=x onerror=alert(1)>');
 assert.equal(s.members.find(x=>x.key==='healos animosity').gear.slots[6].item.id,null);
});
