import test from 'node:test';
import assert from 'node:assert/strict';
import {modelIdentity,modelEquipment,modelPayload,VISUAL_SLOTS} from '../assets/model-viewer.js';
import {assemble,unwrapImports} from '../assets/parser.js';
import {createCatalog} from '../assets/catalog.js';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../reference-fixtures/PlusOne_FATE_v7_Full20Raider_Deadmines.json',import.meta.url)));
test('male and female Classic character identities use actual race/sex records',()=>{
 assert.deepEqual(modelIdentity({race:'Human',characterSex:'Male'}),{race:1,gender:0});
 assert.deepEqual(modelIdentity({race:'Night Elf',characterSex:'Female'}),{race:4,gender:1});
 assert.deepEqual(modelIdentity({race:'Blood Elf',characterSex:'Female'}),{race:10,gender:1});
 assert.deepEqual(modelIdentity({race:'Unknown',characterSex:'Unknown'}),{race:null,gender:null});
});
test('never misrepresent item IDs as visual display IDs',()=>{
 const gear={slots:[{slot:1,item:{id:19019,name:'Sword'}}]};
 assert.deepEqual(modelEquipment(gear),[]);
 assert.deepEqual(modelEquipment(gear,new Map([['19019',{displayId:44812}]])),[[1,44812]]);
});
test('Classic viewer uses documented visual slots, skips jewelry and invalid values',()=>{
 const gear={slots:[{slot:16,item:{id:11,displayId:345}},{slot:17,item:{id:12,displayId:234}},{slot:2,item:{id:14,displayId:333}},{slot:1,item:{id:15,displayId:0}}]};
 assert.equal(VISUAL_SLOTS[16],21);assert.equal(VISUAL_SLOTS[17],22);
 assert.deepEqual(modelEquipment(gear),[[21,345],[22,234]]);
});
test('viewing a historical snapshot sends only that snapshot to 3D payload',()=>{
 const profile={race:'Human',characterSex:'Male'};
 const old={slots:[{slot:1,item:{id:1,displayId:100}}]};
 const now={slots:[{slot:1,item:{id:1,displayId:200}}]};
 assert.deepEqual(modelPayload(profile,old,new Map()).items,[[1,100]]);
 assert.deepEqual(modelPayload(profile,now,new Map()).items,[[1,200]]);
 assert.equal(modelPayload({race:'Unknown',characterSex:'Unknown'},now,new Map()),null);
});
test('future exports preserve displayId through parse, catalog and character history',()=>{
 const sample=structuredClone(fixture);
 const chars=Object.keys(sample.session.gearSnapshots);
 assert.ok(chars.length);
 const snap=sample.session.gearSnapshots[chars[0]];
 const first=snap.slots.find(x=>x.empty===false);
 first.itemDisplayID=512345;
 const c=createCatalog(assemble(unwrapImports(sample,'display-test.json')));
 assert.ok(c.characters.some(p=>p.latestGear?.slots.some(x=>x.item?.displayId===512345)));
});
