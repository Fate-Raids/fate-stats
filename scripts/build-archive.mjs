/** Deterministic GitHub Pages build. Read-only original exports are source of truth.
 * Derived indexes are published but are never committed back to Git.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assemble, unwrapImports, normalizeSource} from '../assets/parser.js';
import {createCatalog} from '../assets/catalog.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(repo,'raid-exports');
const dist=path.join(repo,'dist');
const LIMIT_FILE=32*1024*1024; // per upload safeguard; not a 500-session archive cap
const LIMIT_COMBINED=900*1024*1024; // safeguard below Pages' 1 GB publication limit
const MAX_OUTPUT=950*1024*1024;
async function gather(root){
 const out=[];
 async function walk(p){for(const ent of await fs.readdir(p,{withFileTypes:true})){
   const full=path.join(p,ent.name);
   if(ent.isSymbolicLink())throw Error(`Symlinks prohibited in raid-exports: ${full}`);
   if(ent.isDirectory())await walk(full);
   else if(ent.isFile() && ent.name.toLowerCase().endsWith('.json'))out.push(full);
 }}
 await walk(root);return out.sort();
}
function recognized(v){
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 if(/^plusone/i.test(String(v.schema||v.format||'')))return true;
 if(['sessions','raidSessions','archivedSessions','raidHistory','completedSessions','sessionHistory'].some(k=>Array.isArray(v[k])&&v[k].length))return true;
 if(['sessionID','sessionId','sessionName','raidName','raidZone','raidInstance'].some(k=>v[k]!=null))return true;
 if(['loot','lootHistory','awards','drops','entries','lootEntries'].some(k=>Array.isArray(v[k])&&v[k].length))return true;
 return false;
}
export async function build(){
 await fs.mkdir(dir,{recursive:true});
 const paths=await gather(dir); const seen=new Set(), sources=[];let duplicates=0,bytes=0;
 for(const file of paths){
  const rel=path.relative(dir,file).replaceAll(path.sep,'/');const stat=await fs.stat(file);
  if(stat.size>LIMIT_FILE)throw Error(`${rel}: file exceeds 32 MiB upload safeguard`);
  bytes+=stat.size;if(bytes>LIMIT_COMBINED)throw Error('Exports exceed the 900 MiB safeguard; review archive size before deployment.');
  let raw;try{raw=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){throw Error(`${rel}: invalid JSON (${e.message})`);}
  let imports;try{imports=unwrapImports(raw,rel);}catch(e){throw Error(`${rel}: not a PlusOne export (${e.message})`);}
  if(!imports.length)throw Error(`${rel}: archive contains no sources`);
  for(const source of imports){
   if(!recognized(source.payload))throw Error(`${rel}: not a recognizable PlusOne raid export`);
   let sessions;try{sessions=normalizeSource(source);}catch(e){throw Error(`${rel}: invalid raid session (${e.message})`);}
   if(!sessions.length||sessions.every(s=>!(s.entries.length||s.softRes.length||s.players.length||['sessionId','sessionID','sessionName','raidName','raidZone','raidInstance','instance'].some(k=>s.raw?.[k]!=null))))
    throw Error(`${rel}: no recognizable raid session records`);
   if(seen.has(source.id)){duplicates++;continue;}
   seen.add(source.id);sources.push(source);
  }
 }
 let overrides={};
 const overrideFile=path.join(repo,'data','item-overrides.json');
 try{overrides=JSON.parse(await fs.readFile(overrideFile,'utf8'));if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))throw Error('Expected object');}
 catch(e){if(e.code!=='ENOENT')throw Error(`data/item-overrides.json: ${e.message}`);}
 const data=assemble(sources);
 const generatedAt=new Date().toISOString();
 const catalog=createCatalog(data,{generatedAt,overrides});
 // Validate and create candidate output before replacing the previous build.
 const temp=path.join(repo,'dist-next');await fs.rm(temp,{recursive:true,force:true});
 const write=async(relative,object)=>{const dest=path.join(temp,relative);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,JSON.stringify(object)+'\n');};
 await fs.mkdir(path.join(temp,'assets'),{recursive:true});
 await fs.copyFile(path.join(repo,'index.html'),path.join(temp,'index.html'));
 for(const asset of ['site.js','site.css','catalog.js','parser.js','fate-crest.svg','character-silhouette.svg'])await fs.copyFile(path.join(repo,'assets',asset),path.join(temp,'assets',asset));
 await fs.writeFile(path.join(temp,'.nojekyll'),'');
 // Raw exports remain in raid-exports within Git. Do not duplicate them into the public site.
 // Legacy PlusOne web-archive-v1 inputs are still recognized by unwrapImports.
 await write('data/manifest.json',catalog.manifest);
 await write('data/overview.json',catalog.overview);
 await write('data/characters/index.json',catalog.characterIndex);
 await write('data/items/index.json',catalog.itemIndex);
 await write('data/rolls/overview.json',catalog.rollReport);
 await write('data/sessions/index.json',catalog.sessIndex);
 for(const p of catalog.characters)await write(`data/characters/${p.id}.json`,p);
 for(const s of catalog.sessionRecords)await write(`data/sessions/${s.id}.json`,s);
 for(const it of catalog.itemRecords)await write(`data/items/${it.slug}.json`,it);
 const unresolved=catalog.itemIndex.filter(i=>!String(i.icon||'').trim());
 await write('data/diagnostics.json',{generatedAt,sourceFiles:paths.length,sources:sources.length,originalBytes:bytes,
   publishedCharacters:catalog.characters.length,publishedSessions:catalog.sessIndex.length,distinctItems:catalog.itemIndex.length,
   missingExportedIconSlugs:unresolved.length,missingIconExamples:unresolved.slice(0,50).map(i=>({id:i.id,name:i.name})),
   note:'Missing icon slug does not guarantee Wowhead cannot render an icon at runtime; provider support must be browser-verified.'});
 let total=0;async function sizeWalk(p){for(const e of await fs.readdir(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())await sizeWalk(f);else total+=(await fs.stat(f)).size;}}await sizeWalk(temp);
 if(total>MAX_OUTPUT){await fs.rm(temp,{recursive:true,force:true});throw Error(`Generated data ${total} bytes exceeds safety threshold. Split published data before deploying.`);}
 await fs.rm(dist,{recursive:true,force:true});await fs.rename(temp,dist);
 console.log(`PASS: ${paths.length} JSON file(s), ${sources.length} distinct source(s), ${duplicates} duplicate(s) skipped`);
 console.log(`PASS: ${data.sessions.length} raid session(s), ${data.entries.length} awards, ${data.players.length} raider(s), ${data.sessions.reduce((n,s)=>n+s.softRes.length,0)} soft-reserve slots`);
 console.log(`PASS: ${catalog.characters.length} indexed characters, ${catalog.itemIndex.length} distinct items, ${unresolved.length} without exported icon slugs`);
 console.log(`PASS: site output ${Math.round(total/1024)} KiB written to ${dist}`);
 return {sources:sources.length,sessions:catalog.sessIndex.length,characters:catalog.characters.length,items:catalog.itemIndex.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{await build();}catch(e){console.error('BUILD FAILED:',e.message);process.exitCode=1;}
