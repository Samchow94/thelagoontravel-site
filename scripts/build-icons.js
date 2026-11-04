#!/usr/bin/env node
/*
 * Génère le sous-ensemble Tabler Icons du site :
 *   assets/fonts/tabler-icons-subset.woff2  +  assets/css/tabler-subset.css
 *
 * Usage (depuis la racine du dépôt) :
 *   npm install --no-save subset-font@2.9.0
 *   npm pack @tabler/icons-webfont@3.49.0 --pack-destination %TEMP%\tabler   (puis extraire l'archive)
 *   node scripts/build-icons.js <dossier-extrait>/package
 *
 * Le script repère toutes les classes « ti-xxx » utilisées dans les .html, .js et .css du site
 * (hors admin/, archive/, docs/, scripts/), retrouve leur code dans le CSS de Tabler, et ne
 * garde que ces glyphes. Voir docs/PERFORMANCE.md.
 */
const fs = require('fs');
const path = require('path');
const subsetFont = require('subset-font');
const fontverter = require('fontverter'); // installé avec subset-font

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['.git', 'node_modules', 'archive', 'docs', 'scripts', 'admin', 'images', 'videos', 'fonts', 'content', '.netlify']);
const BS = String.fromCharCode(92);

// Métriques Windows (OS/2) des fichiers Tabler servis par jsDelivr jusqu'ici (polices découpées en
// groupes) : winAscent 990 / winDescent 100. Le fichier complet a winDescent 104 (à cause des
// glyphes les plus bas de toute la police), ce qui décale les icônes d'une fraction de pixel sous
// Windows. On impose donc les valeurs d'origine pour garder un rendu identique.
const WIN_ASCENT = 990;
const WIN_DESCENT = 100;

function sum32(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 4) {
    const w = Buffer.alloc(4);
    buf.copy(w, 0, i, Math.min(i + 4, buf.length));
    sum = (sum + w.readUInt32BE(0)) >>> 0;
  }
  return sum;
}

function patchWinMetrics(ttf) {
  const buf = Buffer.from(ttf);
  const n = buf.readUInt16BE(4);
  let os2, head;
  for (let i = 0; i < n; i++) {
    const p = 12 + i * 16;
    const tag = buf.toString('latin1', p, p + 4);
    if (tag === 'OS/2') os2 = p;
    if (tag === 'head') head = p;
  }
  const off = buf.readUInt32BE(os2 + 8), len = buf.readUInt32BE(os2 + 12);
  buf.writeUInt16BE(WIN_ASCENT, off + 74);
  buf.writeUInt16BE(WIN_DESCENT, off + 76);
  buf.writeUInt32BE(sum32(buf.subarray(off, off + len + ((4 - (len % 4)) % 4))), os2 + 4);
  const headOff = buf.readUInt32BE(head + 8);
  buf.writeUInt32BE(0, headOff + 8);
  buf.writeUInt32BE((0xB1B0AFBA - sum32(buf)) >>> 0, headOff + 8);
  return buf;
}
const pkg = process.argv[2];
if (!pkg) { console.error('Usage : node scripts/build-icons.js <dossier du paquet @tabler/icons-webfont>'); process.exit(1); }

const version = JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'), 'utf8')).version;
const tablerCss = fs.readFileSync(path.join(pkg, 'dist', 'tabler-icons.min.css'), 'utf8');
const codes = {};
const re = new RegExp(BS + '.ti-([a-z0-9-]+):before' + BS + '{content:"' + BS + BS + '([0-9a-f]+)"' + BS + '}', 'g');
for (const m of tablerCss.matchAll(re)) codes[m[1]] = m[2];
const baseRule = /\.ti\{[^}]*\}/.exec(tablerCss)[0];

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); }
    else if (/[.](html|js|css)$/.test(e.name) && e.name !== 'tabler-subset.css') files.push(p);
  }
})(ROOT);

const used = new Set();
for (const f of files) for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bti-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) used.add(m[1]);
const unknown = [...used].filter(n => !codes[n]);
if (unknown.length) { console.error('Icônes inconnues de Tabler ' + version + ' : ' + unknown.join(', ')); process.exit(1); }
const names = [...used].sort();

(async () => {
  const font = fs.readFileSync(path.join(pkg, 'dist', 'fonts', 'tabler-icons.woff2'));
  const text = String.fromCodePoint(...names.map(n => parseInt(codes[n], 16)));
  const ttf = await subsetFont(font, text, { targetFormat: 'truetype' });
  const out = await fontverter.convert(patchWinMetrics(ttf), 'woff2');
  fs.mkdirSync(path.join(ROOT, 'assets', 'fonts'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'assets', 'fonts', 'tabler-icons-subset.woff2'), out);

  // unicode-range limité aux icônes (comme les fichiers Tabler d'origine) : sans lui, la métrique de ligne
  // des éléments .ti change d'une fraction de pixel et les icônes se décalent.
  const range = names.map(n => codes[n].toUpperCase()).sort().map(c => 'U+' + c).join(',');
  let css = '/*!\n * Sous-ensemble de Tabler Icons ' + version + ' (webfont) — ' + names.length + ' icônes utilisées par le site.\n' +
    ' * Tabler Icons © Paweł Kuna, licence MIT : assets/fonts/LICENSES/LICENSE-tabler-icons.txt\n' +
    ' * Fichier généré par scripts/build-icons.js — ne pas modifier à la main (voir docs/PERFORMANCE.md).\n */\n';
  css += '@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:swap;src:url("../fonts/tabler-icons-subset.woff2") format("woff2");unicode-range:' + range + '}\n';
  css += baseRule + '\n';
  for (const n of names) css += '.ti-' + n + ':before{content:"' + BS + codes[n] + '"}\n';
  fs.writeFileSync(path.join(ROOT, 'assets', 'css', 'tabler-subset.css'), css);
  console.log('OK : ' + names.length + ' icônes, police ' + out.length + ' octets (Tabler ' + version + ').');
})();
