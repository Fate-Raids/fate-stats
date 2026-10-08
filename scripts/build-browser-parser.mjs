import fs from 'node:fs';
const source=fs.readFileSync('assets/parser.js','utf8');
const transformed=source.replace(/export const /g,'const ').replace(/export function /g,'function ');
fs.writeFileSync('assets/parser-browser.js',
 "/* Generated classic-script adapter from parser.js. No ES module/CORS requirement. */\n(function(){\n'use strict';\n"+transformed+
 "\nwindow.PlusOneParser={ARCHIVE_FORMAT,hashText,makeSource,isArchive,unwrapImports,normalizeMode,normalizeSource,assemble,publishedArchive,rollSummary};\n})();\n");
console.log('Regenerated assets/parser-browser.js');
