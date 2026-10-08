import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SAMPLE=path.join(ROOT,'samples','PlusOne_Synthetic_FATE_MoltenCore_20Raiders_60Items.json');
function fixtureRoot(){
 const d=mkdtempSync(path.join(tmpdir(),'plusone-pages-test-'));
 for (const x of ['index.html']) cpSync(path.join(ROOT,x),path.join(d,x));
 for (const x of ['assets','scripts']) cpSync(path.join(ROOT,x),path.join(d,x),{recursive:true});
 mkdirSync(path.join(d,'raid-exports'));
 return d;
}
function run(dir){try{return {ok:true,out:execFileSync(process.execPath,['scripts/build-archive.mjs'],{cwd:dir,encoding:'utf8'})}}catch(e){return {ok:false,out:e.stderr?.toString()||e.message}}}
function archive(dir){return JSON.parse(readFileSync(path.join(dir,'dist/data/archive.json'),'utf8'));}

test('empty new GitHub site deploys without accidentally publishing sample data',()=>{
 const dir=fixtureRoot();const r=run(dir);assert.ok(r.ok,r.out);
 assert.equal(archive(dir).sources.length,0);
 assert.equal(existsSync(path.join(dir,'dist/raid-exports')),false);
 assert.equal(existsSync(path.join(dir,'dist/scripts')),false);
 assert.equal(existsSync(path.join(dir,'dist/assets/parser.js')),false);
});

test('synthetic export builds 1 raid, 60 awards, 20 raiders, 26 reserves',async()=>{
 const dir=fixtureRoot();cpSync(SAMPLE,path.join(dir,'raid-exports','sample.json'));
 const r=run(dir);assert.ok(r.ok,r.out);
 assert.match(r.out,/1 raid session\(s\), 60 awards, 20 raider\(s\), 26 soft-reserve slots/);
 const a=archive(dir);assert.equal(a.sources.length,1);
 assert.equal(a.sources[0].payload.synthetic,true);
 assert.equal(a.sources[0].payload.sessions[0].roster.length,20);
});

test('duplicate payload is counted once even with different filenames',()=>{
 const dir=fixtureRoot();
 cpSync(SAMPLE,path.join(dir,'raid-exports','a.json'));
 cpSync(SAMPLE,path.join(dir,'raid-exports','b.json'));
 const r=run(dir);assert.ok(r.ok,r.out);
 assert.match(r.out,/1 duplicate\(s\) skipped/);
 assert.equal(archive(dir).sources.length,1);
});

test('two different exports are preserved separately',()=>{
 const dir=fixtureRoot();
 const raw=JSON.parse(readFileSync(SAMPLE,'utf8'));
 writeFileSync(path.join(dir,'raid-exports','first.json'),JSON.stringify(raw));
 raw.sessions[0].sessionId='FATE-SECOND-RAID';raw.sessions[0].startedAt='2026-10-14T19:30:00-07:00';
 writeFileSync(path.join(dir,'raid-exports','second.json'),JSON.stringify(raw));
 const r=run(dir);assert.ok(r.ok,r.out);
 assert.match(r.out,/2 raid session\(s\), 120 awards/);
 assert.equal(archive(dir).sources.length,2);
});

test('malformed JSON fails deployment without replacing previous build',()=>{
 const dir=fixtureRoot();const first=run(dir);assert.ok(first.ok,first.out);
 const before=readFileSync(path.join(dir,'dist/data/archive.json'),'utf8');
 writeFileSync(path.join(dir,'raid-exports','bad.json'),'{ this is not json');
 const r=run(dir);assert.equal(r.ok,false);assert.match(r.out,/bad\.json: invalid JSON/);
 assert.equal(readFileSync(path.join(dir,'dist/data/archive.json'),'utf8'),before);
});

test('unrelated JSON is rejected instead of being displayed as a fake raid',()=>{
 const dir=fixtureRoot();writeFileSync(path.join(dir,'raid-exports','fake.json'),JSON.stringify({hello:'world'}));
 const r=run(dir);assert.equal(r.ok,false);assert.match(r.out,/not a recognizable PlusOne raid export/);
});

test('previously published web archives can be imported with original raw fields',()=>{
 const dir=fixtureRoot();const payload=JSON.parse(readFileSync(SAMPLE,'utf8'));
 writeFileSync(path.join(dir,'raid-exports','old-archive.json'),JSON.stringify({format:'plusone-web-archive-v1',sources:[{id:'old',name:'older.json',payload}]}));
 const r=run(dir);assert.ok(r.ok,r.out);assert.equal(archive(dir).sources.length,1);
 assert.equal(archive(dir).sources[0].payload.syntheticDisclaimer,payload.syntheticDisclaimer);
});


test('schema header alone is not misrepresented as a raid session',()=>{
 const dir=fixtureRoot();writeFileSync(path.join(dir,'raid-exports','empty.json'),JSON.stringify({schema:'PlusOneRaidHistory-4'}));
 const r=run(dir);assert.equal(r.ok,false);assert.match(r.out,/no recognizable raid session records/);
});
