"""Self-contained browser-level smoke test of UI using in-memory static assets.
Normal HTTP page navigation is blocked by the tool container's browser admin policy.
Use about:blank + fake same-origin fetch to exercise real frontend DOM/JS.
"""
import re, json, base64, mimetypes, pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path('/mnt/data/FATE_GuildArmory_v1.0_DemoSite')
source=pathlib.Path('/mnt/data/fate-armory-v1')
html=(root/'index.html').read_text()
html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S)
html=re.sub(r'<script\b[^>]*/?>','',html,flags=re.S)
html=re.sub(r'<link\b[^>]*>','',html,flags=re.S)
html=re.sub(r'<script\s*type="module"[^>]*></script>','',html)
for name in ['fate-crest.svg','character-silhouette.svg']:
 b64=base64.b64encode((root/'assets'/name).read_bytes()).decode()
 html=html.replace('assets/'+name,'data:image/svg+xml;base64,'+b64)
css=(root/'assets/site.css').read_text()
css=re.sub(r'@import url\([^)]*\);','',css)
parser=(source/'assets/parser.js').read_text();parser=re.sub(r'^export \{[^\n]+\};\s*','',parser,flags=re.M).replace('export const ','const ').replace('export function ','function ')
cat=(source/'assets/catalog.js').read_text();cat=re.sub(r'^import .*?;\s*','',cat,flags=re.M).replace('export function ','function ')
site=(source/'assets/site.js').read_text();site=re.sub(r'^import .*?;\s*','',site,flags=re.M)
assets={}
for f in (root/'data').rglob('*.json'):assets[f.relative_to(root).as_posix()]=json.loads(f.read_text())
# JSON textual values may include accidental </script> not relevant since added via evaluation
bundle='''const Parser=(()=>{''' + parser + '''\nreturn {hashText,rollSummary,gearSlotNames,assemble,unwrapImports};})();\n'''
bundle+='const Catalog=(({hashText,rollSummary,gearSlotNames})=>{'+cat+'\nreturn {createCatalog};})(Parser);\n'
bundle+='const {assemble,unwrapImports}=Parser;const {createCatalog}=Catalog;\n'+site
# about:blank harness cannot load static images over a blocked file URL; inline the SVG asset for screenshot fidelity.
inline_svg=base64.b64encode((root/'assets'/'character-silhouette.svg').read_bytes()).decode()
bundle=bundle.replace('assets/character-silhouette.svg','data:image/svg+xml;base64,'+inline_svg)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-web-security'])
 page=b.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html)
 page.add_style_tag(content=css)
 page.evaluate('(assets)=> {window.fetch=async (path)=> {const obj=assets[String(path).replace(/^\\//, "")];if(!obj)return {ok:false,status:404,json:async()=>{throw Error("not found")}};return {ok:true,status:200,json:async()=>obj};};}',assets)
 page.add_script_tag(content=bundle)
 page.wait_for_selector('.hero',timeout=15000)
 print('OVERVIEW',page.title(),page.locator('.metric-value').all_text_contents()[:4]);page.screenshot(path='/mnt/data/fate_home_preview.png',full_page=True)
 page.locator('[data-page="characters"]').first.click();page.wait_for_selector('.character-card',timeout=10000)
 print('RAIDER CARDS',page.locator('.character-card').count())
 page.locator('.character-card').first.click();page.wait_for_selector('.profile-header',timeout=10000)
 print('PROFILE',page.locator('.profile-header h1').inner_text(),'SLOTS',page.locator('.equip-slot').count(),'HISTORY',page.locator('.history-entry').count())
 page.screenshot(path='/mnt/data/fate_armory_preview.png',full_page=True)
 page.locator('[data-tab="reserves"]').click();print('RESERVES',page.locator('table tbody tr').count())
 page.locator('[data-page="items"]').first.click();page.wait_for_selector('table.data-table')
 print('ITEM TABLE',page.locator('table tbody tr').count())
 page.locator('[data-page="item"]').first.click();page.wait_for_selector('.item-head')
 print('ITEM PAGE',page.locator('.item-head h1').inner_text())
 page.locator('[data-page="rolls"]').first.click();page.wait_for_selector('.roll-metrics')
 print('ROLL VALUES',page.locator('.metric-value').all_text_contents()[:4]);print('PAGE ERRORS',errors)
 mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
 mobile.set_content(html);mobile.add_style_tag(content=css)
 mobile.evaluate('(assets)=> {window.fetch=async (path)=> {const obj=assets[String(path).replace(/^\\//, "")];if(!obj)return {ok:false,status:404,json:async()=>{throw Error("not found")}};return {ok:true,status:200,json:async()=>obj};};}',assets)
 mobile.add_script_tag(content=bundle);mobile.wait_for_selector('.hero')
 mobile.screenshot(path='/mnt/data/fate_mobile_preview.png',full_page=True)
 print('MOBILE OVERFLOW',mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth'))
 mobile.locator('#menu-toggle').click();print('NAV DISPLAY',mobile.locator('#sidebar').get_attribute('class'))
 mobile.locator('[data-page="characters"]').first.click();mobile.wait_for_selector('.character-card')
 mobile.locator('.character-card').first.click();mobile.wait_for_selector('.equip-slot')
 mobile.screenshot(path='/mnt/data/fate_armory_mobile_preview.png',full_page=True)
 print('MOBILE ARMORY OVERFLOW',mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth'),'SLOTS',mobile.locator('.equip-slot').count())
 b.close()
