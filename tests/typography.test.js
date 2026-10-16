import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../assets/site.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../assets/site.js',import.meta.url),'utf8');
test('text size settings exist and persist locally without modifying archive data',()=>{
 assert.match(html,/id="font-settings-panel"/);
 assert.match(html,/id="font-scale-range"[^>]+max="160"/);
 assert.match(script,/localStorage\.setItem\(FONT_STORAGE_KEY/);
 assert.match(script,/document\.documentElement\.style\.setProperty\('--fate-font-scale'/);
 assert.match(script,/aria-pressed/);
 assert.match(script,/function closeFontSettings/);
});
test('headers, rows, and table headers use the same font scale',()=>{
 assert.match(css,/\.page-head h1\{font-size:calc\(clamp\([^;]+var\(--fate-font-scale/);
 assert.match(css,/\.row-title\{font-size:calc\(13px \* var\(--fate-font-scale/);
 assert.match(css,/\.data-table th\{[^}]*font-size:calc\(9px \* var\(--fate-font-scale/);
 assert.match(css,/\.data-table td\{/);
 assert.match(css,/font-settings-panel/);
});
