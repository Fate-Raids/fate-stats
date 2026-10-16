/** FATE optional 3D character model integration.
 * A lazy, experimental adapter for Miorey/wow-model-viewer (ISC), NOT a fork.
 * The library requires third-party Wowhead/ZamModelViewer assets. No proxies,
 * scraping or redistributed proprietary assets are included in this project.
 * Failure never affects the authoritative icon-based equipment panel.
 */
export const MODEL_LIBRARY = 'https://cdn.jsdelivr.net/npm/wow-model-viewer@1.5.3/+esm';
export const MODEL_ASSETS = 'https://wow.zamimg.com/modelviewer/classic/';
export const MODEL_VIEWER_SCRIPT = MODEL_ASSETS + 'viewer/viewer.min.js';
const RACE_IDS = Object.freeze({human:1,orc:2,dwarf:3,nightelf:4,undead:5,scourge:5,tauren:6,gnome:7,troll:8,bloodelf:10,draenei:11});
// PlusOne 1..19 equipment capture indices => ZamModelViewer visual slots.
// Jewelry, ranged ammo and tabards are intentionally omitted unless a valid
// renderer display slot mapping is verified; do not guess cosmetic appearances.
export const VISUAL_SLOTS = Object.freeze({1:1,3:3,5:5,6:6,7:7,8:8,9:9,10:10,15:15,16:21,17:22});
export function modelIdentity(character={}) {
  const rawId=Number(character.raceID??character.raceId);
  const token=String(character.race||'').toLowerCase().replace(/[^a-z]/g,'');
  const race=Number.isInteger(rawId)&&rawId>0&&rawId<=40?rawId:RACE_IDS[token]||null;
  const sexId=Number(character.characterSexID??character.sexID);
  const sexToken=String(character.characterSex||'').toLowerCase();
  const gender=[0,1].includes(sexId)&&character.characterSexID!=null?sexId:sexToken==='male'?0:sexToken==='female'?1:null;
  return {race,gender};
}
export function modelEquipment(gear, itemRegistry=new Map()) {
  if(!Array.isArray(gear?.slots))return [];
  const unique=new Map();
  for(const slot of gear.slots){
    const visualSlot=VISUAL_SLOTS[Number(slot.slot)];if(!visualSlot||!slot.item)continue;
    const registry=itemRegistry.get(String(slot.item.id))||{};
    const raw=slot.item.displayId??slot.item.displayID??registry.displayId??registry.displayID;
    const id=Number(raw);
    if(!Number.isSafeInteger(id)||id<=0)continue;
    unique.set(visualSlot,[visualSlot,id]);
  }
  return [...unique.values()].sort((a,b)=>a[0]-b[0]);
}
export function modelPayload(character,gear,registry){
  const identity=modelIdentity(character);
  if(identity.race===null||identity.gender===null) return null;
  const appearance=character.appearance||{};
  const parts={};
  for(const key of ['skin','face','hairStyle','hairColor','facialStyle']){
    const val=Number(appearance[key]);
    parts[key]=Number.isInteger(val)&&val>=0&&val<=100?val:0;
  }
  return {...identity,...parts,items:modelEquipment(gear,registry),noCharCustomization:true};
}
let assetsPromise;
function loadScript(url,integrity){return new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=url;script.async=true;
  if(integrity){script.integrity=integrity;script.crossOrigin='anonymous';}
  script.onload=resolve;script.onerror=()=>reject(new Error(`Required 3D dependency unavailable: ${url.split('/').at(-1)}`));
  document.head.append(script);
});}
async function assets(){
  if(!assetsPromise)assetsPromise=(async()=>{
    if(!window.jQuery)await loadScript('https://code.jquery.com/jquery-3.5.1.min.js','sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=');
    if(!window.ZamModelViewer)await loadScript(MODEL_VIEWER_SCRIPT);
    window.CONTENT_PATH=MODEL_ASSETS;
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API=undefined;
    const lib=await import(/* webpackIgnore: true */ MODEL_LIBRARY);
    if(typeof lib.generateModels!=='function')throw Error('3D viewer package does not expose generateModels');
    return lib;
  })().catch(e=>{assetsPromise=null;throw e;});
  return assetsPromise;
}
export async function createModel(container,payload){
  if(!container?.isConnected)throw Error('Character viewer is no longer visible');
  if(!payload)throw Error('Verified character race and sex required for a model');
  if(!window.WebGLRenderingContext)throw Error('WebGL is not enabled in this browser');
  const lib=await assets();
  if(!container.isConnected)throw Error('Character viewer was closed');
  // The third-party library accepts an element selector, not a DOM node.
  if(!container.id)throw Error('3D viewer container requires a unique ID');
  return lib.generateModels(1.55,'#'+container.id,payload,'classic');
}
