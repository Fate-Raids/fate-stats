import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSource,assemble,normalizeSource,normalizeMode,rollSummary,publishedArchive,unwrapImports} from '../assets/parser.js';
const sample=JSON.parse(readFileSync(new URL('../samples/PlusOne_Synthetic_FATE_MoltenCore_20Raiders_60Items.json',import.meta.url),'utf8'));
test('60 loot rounds store individual participants, matching real roll values from synthetic export',()=>{
 const a=assemble([makeSource(sample)]);
 assert.equal(a.entries.length,60);assert.equal(a.sessions[0].rollEvents.length,60);
 assert.ok(a.rolls.length>140);
 assert.equal(a.rolls.filter(r=>r.won===true).length,60);
 assert.equal(a.players.length,20);
 assert.ok(a.rolls.some(r=>r.mode==='Soft Res'&&r.value!==null));
 assert.ok(a.rolls.some(r=>r.mode==='Pass'&&r.value===null));
 assert.ok(a.rolls.some(r=>r.mode==='Soft Res'&&r.value===null));
});
test('passes and reserve eligibilities without dice never distort numeric averages',()=>{
 const source={schema:'PlusOneRaidHistory-5',sessionId:'test',sessionName:'Test',rollEvents:[{
   roundId:'r1',itemId:3,itemName:'Item',winner:'Bob',resolved:true,rolls:[
   {player:'Alice',category:'Main Spec',value:20,max:100},{player:'Bob',category:'Main Spec',value:80,max:100},
   {player:'Carl',category:'Pass',value:null},{player:'Dana',category:'Soft Res',value:null}
   ]}]};
 const db=assemble([makeSource(source)]),sum=rollSummary(db.rolls);
 assert.equal(sum.numericRolls,2);assert.equal(sum.avg,50);assert.equal(sum.wins,1);assert.equal(sum.passes,1);
 assert.equal(db.players.length,4);assert.equal(db.sessions[0].entries.length,0);
 assert.equal(db.rolls.find(r=>r.player==='Dana').status,'choice-only');
});
test('no winner means win rate is unknown, not 0%',()=>{
 const src={schema:'PlusOneRaidHistory-5',sessionId:'s',rollEvents:[{roundId:'r',rolls:[{player:'A',category:'Main Spec',value:55}]}]};
 const a=assemble([makeSource(src)]);assert.equal(a.rolls[0].won,null);assert.equal(rollSummary(a.rolls).winRate,null);
});
test('same round id in session and award is counted only once, duplicate item drops have distinct rounds',()=>{
 const r={roundId:'abc',itemId:1,winner:'A',rolls:[{player:'A',category:'Main Spec',value:90}]};
 const src={schema:'PlusOneRaidHistory-5',sessionId:'s',lootHistory:[{...r,entryId:'abc'},{...r,entryId:'def',roundId:'def'}],rollEvents:[r]};
 const a=assemble([makeSource(src)]);assert.equal(a.sessions[0].rollEvents.length,2);assert.equal(a.rolls.length,2);
});
test('legacy award-only archives do not fabricate rolls',()=>{
 const src={schema:'PlusOneRaidHistory-4',sessionId:'s',loot:[{entryId:'x',itemId:42,winner:'A',rollType:'Main Spec'}]};
 const a=assemble([makeSource(src)]);assert.equal(a.entries.length,1);assert.equal(a.rolls.length,0);
});
test('archive round trip retains every raw roll attempt and fields',()=>{
 const src=makeSource(sample);const restored=unwrapImports(publishedArchive([src]),'archive.json');
 assert.deepEqual(restored[0].payload,sample);
});

test('rerolls do not multiply a winner into multiple awards',()=>{
 const src={schema:'PlusOneRaidHistory-5',sessionId:'x',rollEvents:[{roundId:'r',winner:'Alice',rolls:[
 {player:'Alice',category:'Main Spec',value:35},{player:'Bob',category:'Main Spec',value:74},
 {player:'Alice',category:'Main Spec',value:97}]}]};
 const a=assemble([makeSource(src)]);assert.equal(a.rolls.filter(r=>r.won).length,1);
 assert.equal(rollSummary(a.rolls).numericRolls,3);
});
