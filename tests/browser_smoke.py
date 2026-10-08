"""Browser smoke checks for the actual v0.3.0 GitHub Pages frontend (no remote network required)."""
from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text(encoding='utf8')
html=re.sub(r'<script\b[^>]*>.*?</script>','',html,flags=re.S|re.I)
html=re.sub(r'<link\b[^>]*>','',html,flags=re.I)
fixture=json.loads((ROOT/'samples/PlusOne_Synthetic_FATE_MoltenCore_20Raiders_60Items.json').read_text(encoding='utf8'))
archive={'format':'plusone-web-archive-v1','generatedAt':'2026-10-08T00:00:00Z','sources':[{'id':'test','name':'test.json','importedAt':'2026-10-08T00:00:00Z','payload':fixture}]}
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1380,'height':900})
 errors=[]
 page.on('pageerror',lambda x:errors.append(str(x)))
 page.set_content(html,wait_until='domcontentloaded')
 page.add_style_tag(content=(ROOT/'assets/styles.css').read_text())
 page.add_script_tag(content=(ROOT/'assets/parser-browser.js').read_text())
 page.add_script_tag(content='window.fetch = async () => ({ok:true,json:async()=>('+json.dumps(archive,ensure_ascii=False)+')});')
 page.add_script_tag(content=(ROOT/'assets/app.js').read_text())
 try:
  page.wait_for_function("document.querySelectorAll('.metric-number')[1]?.textContent === '60'",timeout=8000)
 except Exception:
  print('DEBUG errors',errors)
  print('DEBUG html',page.locator('#main').inner_text()[:600])
  print('DEBUG status',page.locator('#startup-status').inner_text()[:300])
  raise
 assert page.locator('.metric-number').all_inner_texts()==['1','60','20','26']
 assert page.locator('#admin-button').count()==0
 print('PASS browser: no PHP admin button; published 1 session, 60 awards, 20 raiders, 26 SoftRes')
 for v,h in [('loot','Loot History'),('players','Raiders'),('statistics','Archive Statistics'),('sessions','Raid Sessions'),('overview','Raid Overview')]:
  page.locator(f'#nav button[data-view="{v}"]').click()
  assert page.locator('h1').inner_text()==h,(v,page.locator('h1').inner_text())
 print('PASS browser: all five navigation views interactive')
 page.locator('#nav [data-view="loot"]').click()
 assert page.locator('tbody tr').count()==60
 assert page.locator('.tag.main').first.bounding_box()['height']<35
 page.locator('#mode-filter').select_option('Soft Res')
 assert page.locator('tbody tr').count()==13
 page.locator('#mode-filter').select_option('all')
 page.locator('#archive-search').fill('Cauterizing Band')
 assert page.locator('tbody tr').count()>=2
 print('PASS browser: compact Main Spec badge; 60 rows; SoftRes filter; item search')
 page.locator('#nav [data-view="players"]').click()
 page.locator('[data-action="player"]').first.click()
 assert page.locator('#drawer').evaluate('(e)=>e.open')
 page.locator('#drawer-close').click()
 page.locator('#nav [data-view="sessions"]').click()
 page.locator('[data-action="session"]').first.click()
 assert page.locator('#drawer-body').get_by_text('Soft reserve snapshot').count()==1
 assert not errors,errors
 print('PASS browser: player/session drawers open; no JavaScript exceptions')
 browser.close()
