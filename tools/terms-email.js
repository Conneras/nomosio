/*
 * Όροι συνδρομής → email επιβεβαίωσης
 * ───────────────────────────────────
 * Μία πηγή για τους όρους: η ενότητα #oroi του index.html. Αυτό το script την κάνει απλό
 * HTML για email και τη γράφει στο supabase/functions/plus-webhook/terms.html, που στέλνεται
 * ολόκληρο μετά από κάθε αγορά. Τρέχει μετά από κάθε αλλαγή στους όρους, πριν το deploy του webhook.
 *
 *   node tools/terms-email.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = src.match(/<section class="oroi" id="oroi">([\s\S]*?)\n<\/section>/);
if (!m) throw new Error('Δεν βρέθηκε η ενότητα #oroi');

let html = m[1]
  .replace(/<div class="eyebrow">[\s\S]*?<\/div>/, '')
  .replace(/<div class="section-head">\s*<h2>([\s\S]*?)<\/h2>\s*<\/div>/, '<h2>$1</h2>')
  .replace(/<\/?div[^>]*>/g, '')
  .replace(/href="#([a-z]+)"/g, 'href="https://nomosio.gr/$1"')
  .replace(/\s(class|id|style)="[^"]*"/g, '')
  .replace(/<h2>/g, '<h2 style="font-size:20px;margin:0 0 12px">')
  .replace(/<h3>/g, '<h3 style="font-size:17px;margin:22px 0 6px">')
  .replace(/\n\s*\n+/g, '\n')
  .trim();

const out = path.join(ROOT, 'supabase', 'functions', 'plus-webhook', 'terms.html');
fs.writeFileSync(out, html + '\n');
const todo = (html.match(/\{\{ΣΥΜΠΛΗΡΩΣΗ:[^}]*\}\}/g) || []).length;
console.log(`OK · ${path.relative(ROOT, out)} · ${html.length} χαρακτήρες${todo ? ` · ΠΡΟΣΟΧΗ: ${todo} κενά στοιχεία, το email δεν θα σταλεί μέχρι να συμπληρωθούν` : ''}`);
