#!/usr/bin/env node
/* ============================================================
   THE LAGOON TRAVEL — scripts/build-i18n.js

   Génère le dictionnaire FR/EN de assets/js/i18n.js à partir de content/.

   Usage :
     node scripts/build-i18n.js           génère (réécrit la zone BEGIN/END GENERATED)
     node scripts/build-i18n.js --check   vérifie sans écrire (échoue si i18n.js n'est pas à jour)

   Sources :
     content/editable/*.json   textes modifiables dans le CMS : { "fr": {clé: texte}, "en": {clé: texte} }
     content/fixed/fr.json     textes non modifiables dans le CMS (formules, prix, formulaires,
     content/fixed/en.json     messages, navigation) : { clé: texte }

   Aucune dépendance externe.
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EDITABLE_DIR = path.join(ROOT, 'content', 'editable');
const FIXED_DIR = path.join(ROOT, 'content', 'fixed');
const TARGET = path.join(ROOT, 'assets', 'js', 'i18n.js');
const BEGIN = '// BEGIN GENERATED';
const END = '// END GENERATED';
const LANGS = ['fr', 'en'];

/* ── Liste blanche HTML ──────────────────────────────── */

const TAGS_EDITABLE = ['strong', 'em', 'br', 'span'];
const TAGS_FIXED = [...TAGS_EDITABLE, 'li'];
const VOID_TAGS = ['br'];
const SPAN_CLASSES = ['plus-sign'];
const STRONG_STYLE = 'white-space: nowrap;'; // seul style autorisé, uniquement sur <strong>

const errors = [];
const warnings = [];
const fail = (where, msg) => {
  const line = `  - ${where} : ${msg}`;
  if (!errors.includes(line)) errors.push(line);
};

function relPath(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function readJson(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) {
    fail(relPath(file), 'fichier introuvable ou illisible');
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(relPath(file), `JSON invalide (${e.message})`);
    return null;
  }
}

/**
 * Notation simple des textes modifiables : **mot** devient <strong>mot</strong>, *mot* devient <em>mot</em>
 * et un retour à la ligne devient <br>.
 * Seules les paires d'astérisques sur un même texte (hors balises) sont converties ; le contenu ne doit
 * ni commencer ni finir par une espace, ni contenir d'astérisque. Une astérisque seule ou non appariée reste littérale.
 * Le gras est traité avant l'italique, pour que **mot** ne devienne pas *<em>mot</em>*.
 */
function convertEmphasis(value) {
  const pair = (text, stars, tag) => text
    .split(/(<[^<>]*>)/)
    .map(part => (part.startsWith('<') ? part : part.replace(
      new RegExp(`\\*{${stars}}([^*\\s<>](?:[^*<>]*[^*\\s<>])?)\\*{${stars}}`, 'g'), `<${tag}>$1</${tag}>`)))
    .join('');
  return pair(pair(value, 2, 'strong'), 1, 'em').replace(/\r?\n/g, '<br>');
}

/** Contrôle le HTML d'une valeur. Renvoie la suite des balises (pour comparer FR/EN). */
function checkHtml(where, value, allowedTags) {
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^<>]*?)(\/?)>/g;
  const stack = [];
  const seq = [];
  let m;

  while ((m = tagRe.exec(value)) !== null) {
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const attrs = m[3].trim();
    seq.push((closing ? '/' : '') + name);

    if (!allowedTags.includes(name)) {
      fail(where, `balise <${name}> interdite (autorisées : ${allowedTags.map(t => '<' + t + '>').join(', ')})`);
      continue;
    }
    if (closing) {
      if (attrs) fail(where, `la balise fermante </${name}> ne doit pas contenir d'attribut`);
      if (stack.pop() !== name) fail(where, `balise </${name}> fermée sans avoir été ouverte, ou mal imbriquée`);
      continue;
    }
    checkAttributes(where, name, attrs);
    if (!VOID_TAGS.includes(name)) stack.push(name);
  }
  if (stack.length) fail(where, `balise <${stack[stack.length - 1]}> non fermée`);

  // Un « < » qui n'appartient à aucune balise reconnue casserait l'affichage
  if (/</.test(value.replace(tagRe, ''))) {
    fail(where, 'caractère « < » isolé ou balise mal formée (utilisez &lt; pour afficher « < »)');
  }
  if (/javascript\s*:/i.test(value)) fail(where, 'le texte « javascript: » est interdit');
  return seq;
}

function checkAttributes(where, tag, attrs) {
  if (!attrs) return;
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  const found = [];
  let m;
  while ((m = attrRe.exec(attrs)) !== null) found.push([m[1].toLowerCase(), m[2]]);
  if (attrs.replace(attrRe, '').trim()) {
    fail(where, `attributs mal formés dans <${tag} ${attrs}> (les valeurs doivent être entre guillemets doubles)`);
    return;
  }
  for (const [name, val] of found) {
    if (name.startsWith('on')) {
      fail(where, `attribut ${name} interdit (gestionnaire d'événement)`);
    } else if (tag === 'span' && name === 'class') {
      const bad = val.split(/\s+/).filter(c => c && !SPAN_CLASSES.includes(c));
      if (bad.length) fail(where, `classe « ${bad.join(' ')} » non autorisée sur <span> (autorisées : ${SPAN_CLASSES.join(', ')})`);
    } else if (tag === 'strong' && name === 'style') {
      if (val.trim() !== STRONG_STYLE) fail(where, `seul style="${STRONG_STYLE}" est autorisé sur <strong>`);
    } else {
      fail(where, `attribut ${name} non autorisé sur <${tag}>`);
    }
  }
}

/* ── Lecture et contrôle des sources ─────────────────── */

function checkEntries(file, dict, allowedTags, emphasis) {
  const where0 = relPath(file);
  if (dict === null || typeof dict !== 'object' || Array.isArray(dict)) {
    fail(where0, 'doit contenir un objet { clé: texte }');
    return {};
  }
  const out = {};
  for (const [key, value] of Object.entries(dict)) {
    const where = `${where0} › ${key}`;
    if (!/^[a-z0-9_.]+$/.test(key)) fail(where, 'nom de clé invalide (minuscules, chiffres, « _ » et « . » seulement)');
    if (typeof value !== 'string') { fail(where, 'la valeur doit être un texte'); continue; }
    if (!value.trim()) { fail(where, 'texte vide'); continue; }
    const html = emphasis ? convertEmphasis(value) : value;
    if (emphasis && /\*/.test(html.replace(/<[^<>]*>/g, ''))) warnings.push(`  - ${where} : astérisque isolée ou non appariée, conservée telle quelle dans le texte`);
    out[key] = { value: html, tags: checkHtml(where, html, allowedTags).join(',') };
  }
  return out;
}

function loadSources() {
  const dict = { fr: {}, en: {} };
  const origin = {}; // clé -> fichier d'origine

  const add = (lang, key, entry, file) => {
    if (key in dict[lang]) fail(`${relPath(file)} › ${key}`, `clé déjà définie dans ${origin[lang + ':' + key]}`);
    dict[lang][key] = entry;
    origin[lang + ':' + key] = relPath(file);
  };

  // Textes modifiables
  let files = [];
  try {
    files = fs.readdirSync(EDITABLE_DIR).filter(f => f.endsWith('.json')).sort();
  } catch (e) {
    fail('content/editable', 'dossier introuvable');
  }
  for (const f of files) {
    const file = path.join(EDITABLE_DIR, f);
    const data = readJson(file);
    if (!data) continue;
    const extra = Object.keys(data).filter(k => !LANGS.includes(k));
    if (extra.length) fail(relPath(file), `langue(s) inattendue(s) : ${extra.join(', ')} (attendu : fr et en)`);
    const per = {};
    for (const lang of LANGS) {
      if (!(lang in data)) { fail(relPath(file), `section « ${lang} » manquante`); continue; }
      per[lang] = checkEntries(file, data[lang], TAGS_EDITABLE, true);
      for (const [k, e] of Object.entries(per[lang])) add(lang, k, e, file);
    }
    if (per.fr && per.en) compareLangs(file, per.fr, per.en);
  }

  // Textes non modifiables
  const fixed = {};
  for (const lang of LANGS) {
    const file = path.join(FIXED_DIR, `${lang}.json`);
    const data = readJson(file);
    if (!data) continue;
    fixed[lang] = checkEntries(file, data, TAGS_FIXED);
    for (const [k, e] of Object.entries(fixed[lang])) add(lang, k, e, file);
  }
  if (fixed.fr && fixed.en) compareLangs(path.join(FIXED_DIR, 'fr.json'), fixed.fr, fixed.en);

  return dict;
}

/** FR et EN doivent avoir exactement les mêmes clés ; les balises identiques (avertissement). */
function compareLangs(file, fr, en) {
  for (const k of Object.keys(fr)) {
    if (!(k in en)) fail(`${relPath(file)} › ${k}`, 'traduction anglaise manquante');
    else if (fr[k].tags !== en[k].tags) warnings.push(`  - ${relPath(file)} › ${k} : les balises HTML diffèrent entre le français et l'anglais`);
  }
  for (const k of Object.keys(en)) {
    if (!(k in fr)) fail(`${relPath(file)} › ${k}`, 'texte français manquant');
  }
}

/** Toute clé data-i18n utilisée dans une page doit exister. */
function checkPageKeys(dict) {
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  for (const page of pages) {
    const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
    for (const m of html.matchAll(/data-i18n(?:-html|-placeholder)?="([^"]+)"/g)) {
      for (const lang of LANGS) {
        if (!(m[1] in dict[lang])) fail(page, `la clé « ${m[1]} » est utilisée dans la page mais absente du dictionnaire ${lang.toUpperCase()}`);
      }
    }
  }
}

/* ── Génération ──────────────────────────────────────── */

function renderZone(dict) {
  const lines = [
    `  ${BEGIN} — produit par scripts/build-i18n.js à partir de content/. Ne pas modifier à la main.`
  ];
  LANGS.forEach((lang, i) => {
    lines.push(`  ${lang}: {`);
    const keys = Object.keys(dict[lang]).sort();
    keys.forEach((k, j) => {
      lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(dict[lang][k].value)}${j < keys.length - 1 ? ',' : ''}`);
    });
    lines.push(`  }${i < LANGS.length - 1 ? ',' : ''}`);
  });
  lines.push(`  ${END}`);
  return lines.join('\n');
}

function injectZone(source, zone) {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const text = source.replace(/\r\n/g, '\n');
  const start = text.indexOf(`  ${BEGIN}`);
  const endIdx = text.indexOf(`  ${END}`);
  if (start === -1 || endIdx === -1 || endIdx < start) {
    throw new Error(`les repères « ${BEGIN} » et « ${END} » sont introuvables dans assets/js/i18n.js`);
  }
  const result = text.slice(0, start) + zone + text.slice(endIdx + `  ${END}`.length);
  return { text: result, withEol: result.replace(/\n/g, eol) };
}

function main() {
  const check = process.argv.includes('--check');
  const dict = loadSources();
  if (!errors.length) checkPageKeys(dict);

  if (warnings.length) {
    console.warn(`Avertissements (${warnings.length}) :\n${warnings.join('\n')}\n`);
  }
  if (errors.length) {
    console.error(`ÉCHEC : ${errors.length} erreur(s) dans le contenu. Aucun fichier n'a été modifié.\n${errors.join('\n')}`);
    process.exit(1);
  }

  let current;
  try {
    current = fs.readFileSync(TARGET, 'utf8');
  } catch (e) {
    console.error('ÉCHEC : assets/js/i18n.js est introuvable.');
    process.exit(1);
  }

  let generated;
  try {
    generated = injectZone(current, renderZone(dict));
  } catch (e) {
    console.error(`ÉCHEC : ${e.message}`);
    process.exit(1);
  }

  const upToDate = generated.text === current.replace(/\r\n/g, '\n');
  const nFr = Object.keys(dict.fr).length;
  const nEn = Object.keys(dict.en).length;

  if (check) {
    if (!upToDate) {
      console.error('ÉCHEC : assets/js/i18n.js n\'est pas à jour par rapport à content/.\nLancez : node scripts/build-i18n.js');
      process.exit(1);
    }
    console.log(`OK : assets/js/i18n.js est à jour (${nFr} clés FR, ${nEn} clés EN).`);
    return;
  }

  if (upToDate) {
    console.log(`Déjà à jour : assets/js/i18n.js (${nFr} clés FR, ${nEn} clés EN).`);
    return;
  }
  fs.writeFileSync(TARGET, generated.withEol);
  console.log(`assets/js/i18n.js généré (${nFr} clés FR, ${nEn} clés EN).`);
}

main();
