/** Build the public GitHub Pages artifact from committed PlusOne JSON exports.
 * No Node packages, credentials, or server are required.
 * The original JSON objects are retained in the published archive for later analysis.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble, publishedArchive, unwrapImports, normalizeSource } from '../assets/parser.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exportsDir = path.join(repo, 'raid-exports');
const dist = path.join(repo, 'dist');
const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL = 50 * 1024 * 1024;
const MAX_FILES = 500;

async function listJson(dir) {
  const files = [];
  const walk = async folder => {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const abs = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(abs);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) files.push(abs);
      else if (entry.isSymbolicLink()) throw Error(`Symlinks are not supported in raid-exports: ${abs}`);
    }
  };
  await walk(dir);
  return files.sort((a,b)=>a.localeCompare(b));
}

function resemblesPlusOneExport(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  if (/^plusone/i.test(String(payload.schema || payload.format || ''))) return true;
  if (['sessions','raidSessions','archivedSessions','raidHistory','completedSessions','sessionHistory'].some(k=>Array.isArray(payload[k]) && payload[k].length)) return true;
  if (['sessionID','sessionId','sessionName','raidName','raidZone','raidInstance'].some(k=>payload[k] != null)) return true;
  if (['loot','lootHistory','awards','drops','entries','lootEntries'].some(k=>Array.isArray(payload[k]) && payload[k].length)) return true;
  return false;
}

export async function build() {
  await fs.mkdir(exportsDir, {recursive:true});
  const paths = await listJson(exportsDir);
  if (paths.length > MAX_FILES) throw Error(`Too many export files (${paths.length}; maximum ${MAX_FILES}).`);
  let totalBytes = 0;
  const sources = [], seen = new Set();
  let duplicateCount = 0;
  for (const p of paths) {
    const relative = path.relative(exportsDir,p).replaceAll(path.sep, '/');
    const stat = await fs.stat(p);
    if (stat.size > MAX_FILE) throw Error(`${relative}: file exceeds 10 MiB limit`);
    totalBytes += stat.size;
    if (totalBytes > MAX_TOTAL) throw Error('Combined exports exceed the 50 MiB safety limit');
    let payload;
    try {payload = JSON.parse(await fs.readFile(p,'utf8'));}
    catch (e) {throw Error(`${relative}: invalid JSON (${e.message})`);}
    let imports;
    try {imports = unwrapImports(payload,relative);}
    catch (e) {throw Error(`${relative}: not a PlusOne export (${e.message})`);}
    if (!imports.length) throw Error(`${relative}: archive contains no sources`);
    for (const source of imports) {
      if (!resemblesPlusOneExport(source.payload)) throw Error(`${relative}: not a recognizable PlusOne raid export`);
      let normalized;
      try {normalized = normalizeSource(source);}
      catch (e) {throw Error(`${relative}: unable to read raid sessions (${e.message})`);}
      if (!normalized.length || normalized.every(s=>!(s.entries.length || s.softRes.length || s.players.length || ['sessionId','sessionID','sessionName','raidName','raidZone','raidInstance','instance'].some(k=>s.raw?.[k]!=null)))) {
        throw Error(`${relative}: no recognizable raid session records`);
      }
      if (seen.has(source.id)) {duplicateCount++;console.log(`SKIP duplicate export: ${relative}`);continue;}
      seen.add(source.id);
      sources.push(source);
    }
  }
  const data = assemble(sources);
  // Build into an isolated folder; never publish scripts, sample data, or GitHub workflow files.
  await fs.rm(dist,{recursive:true,force:true});
  await fs.mkdir(path.join(dist,'assets'),{recursive:true});
  await fs.mkdir(path.join(dist,'data'),{recursive:true});
  await fs.copyFile(path.join(repo,'index.html'),path.join(dist,'index.html'));
  for (const asset of ['app.js','styles.css','parser-browser.js']) {
    await fs.copyFile(path.join(repo,'assets',asset),path.join(dist,'assets',asset));
  }
  await fs.writeFile(path.join(dist,'.nojekyll'),'');
  const published = publishedArchive(sources);
  await fs.writeFile(path.join(dist,'data','archive.json'), JSON.stringify(published,null,2)+'\n','utf8');
  console.log(`PASS: ${paths.length} JSON file(s), ${sources.length} distinct source(s), ${duplicateCount} duplicate(s) skipped`);
  console.log(`PASS: ${data.sessions.length} raid session(s), ${data.entries.length} awards, ${data.players.length} raider(s), ${data.sessions.reduce((n,s)=>n+s.softRes.length,0)} soft-reserve slots`);
  console.log(`PASS: publishable static website written to ${dist}`);
  return {sources:sources.length, sessions:data.sessions.length, awards:data.entries.length, raiders:data.players.length,duplicates:duplicateCount};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await build(); }
  catch (e) { console.error('BUILD FAILED:',e.message); process.exitCode=1; }
}
