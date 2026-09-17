/*
 * Έξυπνες Κινήσεις → SQL
 * ──────────────────────
 * Πηγή αλήθειας: data/moves.json. Το script ελέγχει κάθε κίνηση και βγάζει SQL
 * που ενημερώνει τον πίνακα nomosio_moves (και απενεργοποιεί ό,τι βγήκε από τη λίστα).
 *
 *   node tools/moves-sql.js           → ελέγχει τη μορφή, γράφει .qa/moves.sql
 *   node tools/moves-sql.js --check   → επιπλέον ανοίγει ΚΑΘΕ σύνδεσμο, σταματά αν κάποιος δεν απαντά
 *
 * Κανόνας από τον Ιούλιο: 15 στις 17 κινήσεις είχαν νεκρούς, επινοημένους συνδέσμους.
 * Σύνδεσμος που δεν ανοίγει → η κίνηση δεν μπαίνει.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const moves = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'moves.json'), 'utf8'));
const CHECK = process.argv.includes('--check');

const THEMES = new Set(['work', 'home', 'health', 'rights']);
const WHO = new Set(['μισθωτός', 'ελεύθερος επαγγελματίας', 'νέος έως 25', 'γονιός', 'ιδιοκτήτης σπιτιού',
  'ενοικιαστής', 'οδηγός', 'ασθενής', 'συνταξιούχος', 'Έλληνας εξωτερικού', 'όλοι']);
const EMOJI = /\p{Extended_Pictographic}/u;

const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);
const isUrl = u => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
const isDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

const seen = new Set();
moves.forEach((m, i) => {
  const id = m.id || `#${i}`;
  if (!/^[a-z0-9-]{3,64}$/.test(m.id || '')) fail(id, 'id μόνο πεζά λατινικά, αριθμοί, παύλες');
  if (seen.has(m.id)) fail(id, 'διπλό id');
  seen.add(m.id);
  if (!THEMES.has(m.theme)) fail(id, `άγνωστη θεματική ${m.theme}`);
  if (!m.title || m.title.length > 120) fail(id, 'τίτλος λείπει ή πάνω από 120 χαρακτήρες');
  if (!m.benefit || m.benefit.length > 400) fail(id, 'όφελος λείπει ή πάνω από 400 χαρακτήρες');
  if (!Array.isArray(m.who) || !m.who.length || m.who.some(w => !WHO.has(w))) fail(id, 'ετικέτες «ποιον αφορά» εκτός λίστας');
  if (!Array.isArray(m.steps) || m.steps.length < 1 || m.steps.some(s => typeof s !== 'string' || !s.trim())) fail(id, 'βήματα λείπουν');
  if (!isUrl(m.actionUrl)) fail(id, 'actionUrl πρέπει να είναι https');
  if (!isDate(m.checkedOn)) fail(id, 'checkedOn σε μορφή ΕΕΕΕ-ΜΜ-ΗΗ');
  // Ίδια όρια με τον πίνακα nomosio_moves (002_plus.sql): σταματάμε εδώ, όχι στη βάση.
  if (m.law && m.law.length > 160) fail(id, 'law πάνω από 160 χαρακτήρες');
  if (m.watchOut && m.watchOut.length > 500) fail(id, 'watchOut πάνω από 500 χαρακτήρες');
  if (m.deadline && m.deadline.text && m.deadline.text.length > 500) fail(id, 'προθεσμία πάνω από 500 χαρακτήρες');
  if (m.ref && !/^\/[a-z0-9\/#-]*$/.test(m.ref)) fail(id, 'ref πρέπει να είναι εσωτερική διαδρομή, π.χ. /tekmiria/nomoi');
  if (m.deadline && (!m.deadline.text || !isUrl(m.deadline.sourceUrl))) fail(id, 'προθεσμία χωρίς επίσημη πηγή');
  if (!Array.isArray(m.sources) || !m.sources.length) fail(id, 'χωρίς πηγές');
  (m.sources || []).forEach((s, j) => {
    if (!isUrl(s.url) || !s.title || !s.confirms) fail(id, `πηγή ${j + 1}: url/τίτλος/τι επιβεβαιώνει`);
  });
  const text = [m.title, m.benefit, m.watchOut, ...(m.steps || [])].join(' ');
  if (EMOJI.test(text)) fail(id, 'emoji στο κείμενο');
});

async function checkLinks() {
  const urls = new Map();
  moves.forEach(m => {
    [m.actionUrl, m.deadline && m.deadline.sourceUrl, ...(m.sources || []).map(s => s.url)]
      .filter(Boolean).forEach(u => urls.set(u, m.id));
  });
  // Κάποιοι επίσημοι ιστότοποι κόβουν αυτοματοποιημένα αιτήματα: στέλνουμε κεφαλίδες κανονικού browser.
  // Το EUR-Lex απαντά 202 (έλεγχος κατά των bots) ακόμη και τότε· η σελίδα ανοίγει κανονικά σε browser.
  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
    'Accept-Language': 'el-GR,el;q=0.9,en;q=0.8',
  };
  const BOT_WALL = { 'eur-lex.europa.eu': [202] };
  for (const [url, id] of urls) {
    try {
      const r = await fetch(url, { redirect: 'follow', headers: HEADERS });
      const walled = (BOT_WALL[new URL(url).hostname] || []).includes(r.status);
      if (r.status !== 200 && !walled) fail(id, `σύνδεσμος ${url} απάντησε ${r.status}`);
      else console.error(`${r.status}${walled ? ' (έλεγχος bots, ανοίγει σε browser)' : ''}  ${url}`);
    } catch (e) {
      fail(id, `σύνδεσμος ${url} δεν απάντησε (${e.message})`);
    }
  }
}

const lit = v => (v === null || v === undefined || v === '') ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const textArr = a => `array[${a.map(lit).join(', ')}]::text[]`;
const jsonb = o => `${lit(JSON.stringify(o))}::jsonb`;

function sql() {
  const rows = moves.map((m, i) => `(${[
    lit(m.id), m.sort ?? (i + 1) * 10, lit(m.theme), lit(m.title), textArr(m.who), lit(m.benefit),
    lit(m.law), lit(m.ref), jsonb(m.steps), lit(m.watchOut),
    lit(m.deadline && m.deadline.text), lit(m.deadline && m.deadline.sourceUrl),
    lit(m.actionUrl), jsonb(m.sources), `${lit(m.checkedOn)}::date`,
  ].join(', ')}, true, now())`);
  return `-- Παράχθηκε από tools/moves-sql.js στις ${new Date().toISOString()} · ${moves.length} κινήσεις
begin;
insert into public.nomosio_moves
  (id, sort, theme, title, who, benefit, law, nomosio_ref, steps, watch_out,
   deadline_text, deadline_url, action_url, sources, checked_on, active, updated_at)
values
  ${rows.join(',\n  ')}
on conflict (id) do update set
  sort = excluded.sort, theme = excluded.theme, title = excluded.title, who = excluded.who,
  benefit = excluded.benefit, law = excluded.law, nomosio_ref = excluded.nomosio_ref,
  steps = excluded.steps, watch_out = excluded.watch_out, deadline_text = excluded.deadline_text,
  deadline_url = excluded.deadline_url, action_url = excluded.action_url, sources = excluded.sources,
  checked_on = excluded.checked_on, active = true, updated_at = now();
update public.nomosio_moves set active = false, updated_at = now()
  where active and id not in (${moves.map(m => lit(m.id)).join(', ')});
commit;
`;
}

(async () => {
  if (CHECK && !errors.length) await checkLinks();
  if (errors.length) {
    console.error(`ΣΤΑΜΑΤΗΣΕ — ${errors.length} πρόβλημα(τα):\n  ` + errors.join('\n  '));
    process.exit(1);
  }
  const out = path.join(ROOT, '.qa', 'moves.sql');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, sql());
  console.log(`OK · ${moves.length} κινήσεις${CHECK ? ' · όλοι οι σύνδεσμοι απάντησαν 200' : ''} → .qa/moves.sql`);
})();
