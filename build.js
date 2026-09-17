/*
 * Νομόσιο build
 * ─────────────
 * Πηγή αλήθειας: index.html — ένα αρχείο με ΟΛΟ το περιεχόμενο, που
 * δημοσιεύεται και αυτούσιο ως Claude Artifact.
 *
 * Αυτό το script το κόβει σε πολλές σελίδες για το nomosio.gr, ώστε ο
 * επισκέπτης να μη σκρολάρει δεκάδες χιλιάδες pixels για να βρει κάτι.
 * Το CSS και το JS βγαίνουν σε κοινά αρχεία (assets/) ώστε να φορτώνονται
 * μία φορά και να μένουν στην cache.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const OUT = path.join(__dirname, 'public');

/* Κανένα «{{ΣΥΜΠΛΗΡΩΣΗ: …}}» δεν φτάνει ποτέ στο κοινό: το build σταματά.
   Μόνο για τοπικό έλεγχο: NOMOSIO_ALLOW_TODO=1 node build.js */
const TODO = [...new Set(SRC.match(/\{\{ΣΥΜΠΛΗΡΩΣΗ:[^}]*\}\}/g) || [])];
if (TODO.length && process.env.NOMOSIO_ALLOW_TODO !== '1') {
  throw new Error('Λείπουν στοιχεία πριν τη δημοσίευση:\n  ' + TODO.join('\n  '));
}

/* Οι Έξυπνες Κινήσεις γράφονται μέσα στη σελίδα /kiniseis από το data/moves.json.
   Έλεγχος μορφής και συνδέσμων πριν τη δημοσίευση: node tools/check-moves.js --check */
const MOVES = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'moves.json'), 'utf8'))
  .slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

/* ── 1. Κόψιμο της πηγής στα μέρη της ─────────────────────────────────── */

const styleM = SRC.match(/<style>([\s\S]*?)<\/style>/);
const scriptM = SRC.match(/<script>([\s\S]*?)<\/script>/);
if (!styleM || !scriptM) throw new Error('Δεν βρέθηκε το <style> ή το <script> στην πηγή');
const CSS = styleM[1].trim();
const JS = scriptM[1].trim();

/* Αποτύπωμα περιεχομένου: ο browser κατεβάζει ξανά μόνο ό,τι όντως άλλαξε */
const stamp = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 8);
const CSS_V = stamp(CSS);
const JS_V = stamp(JS);

const heroM = SRC.match(/<header class="hero"[\s\S]*?<\/header>/);
const footerM = SRC.match(/<footer>[\s\S]*?<\/footer>/);
if (!heroM || !footerM) throw new Error('Δεν βρέθηκε το hero ή το footer');
const HERO = heroM[0];
const FOOTER = footerM[0];

/* Κάθε <section id="..."> ή <section class="..." id="..."> ως ξεχωριστό κομμάτι */
const SECTIONS = {};
const secRe = /<section(?:\s+class="[^"]*")?\s+id="([a-z]+)">[\s\S]*?\n<\/section>/g;
let m;
while ((m = secRe.exec(SRC)) !== null) SECTIONS[m[1]] = m[0];

const MEANDER = '<div class="meander" aria-hidden="true"><svg preserveAspectRatio="none" viewBox="0 0 1080 14"><path class="meander-copy" fill="none" stroke="var(--bronze)" stroke-width="1.4" opacity=".55"/></svg></div>';

/* ── 2. Οι σελίδες ────────────────────────────────────────────────────── */

const EXHIBITS = [
  { slug: 'deiktes',     letter: 'Α΄', nav: 'Δείκτες',      title: 'Οι Δείκτες',            blurb: 'Τι βαθμό βάζουν στην Ελλάδα ξένοι οργανισμοί που δεν εξαρτώνται από καμία κυβέρνηση.' },
  { slug: 'skandala',    letter: 'Β΄', nav: 'Σκάνδαλα',     title: 'Τα Σκάνδαλα',           blurb: 'Τι έγινε σε κάθε υπόθεση — και αν πλήρωσε τελικά κανείς.' },
  { slug: 'nomoi',       letter: 'Γ΄', nav: 'Νόμοι',        title: 'Οι Νόμοι',              blurb: 'Ποιον βοηθάει τελικά ο κάθε νόμος, και ποιον όχι.' },
  { slug: 'xrima',       letter: 'Δ΄', nav: 'Χρήμα',        title: 'Το Δημόσιο Χρήμα',      blurb: 'Πού πήγαν τα λεφτά: έργα, ευρωπαϊκά κονδύλια, πρόστιμα.' },
  { slug: 'kyvernisi',   letter: 'Ε΄', nav: 'Κυβέρνηση',    title: 'Η Κυβέρνηση',           blurb: 'Ποιοι κυβερνούν σήμερα και τι έγινε όσο ήταν εκεί.' },
  { slug: 'epitirisi',   letter: 'ΣΤ΄', nav: 'Επιτήρηση',   title: 'Ελευθερίες & Επιτήρηση', blurb: 'Ταυτότητες, κάμερες, τεχνητή νοημοσύνη. Τι ισχύει και τι είναι φήμη.' },
  { slug: 'synora',      letter: 'Ζ΄', nav: 'Σύνορα',       title: 'Σύνορα & Δικαιώματα',   blurb: 'Τι έκρινε το Ευρωπαϊκό Δικαστήριο και τι βρήκαν οι ανεξάρτητες αρχές.' },
  { slug: 'ygeia',       letter: 'Η΄', nav: 'Υγεία',        title: 'Η Υγεία',               blurb: 'Νοσοκομεία, φάρμακα, καρκίνος — με νούμερα, όχι εντυπώσεις.' },
  { slug: 'geopolitiki', letter: 'Θ΄', nav: 'Γεωπολιτική',  title: 'Γεωπολιτική & Άμυνα',   blurb: 'Όπλα, συμμαχίες, εμπόριο. Και γιατί κάποια δεν τα βαθμολογούμε.' },
  { slug: 'kommata',     letter: 'Ι΄', nav: 'Κόμματα',      title: 'Τα Οικονομικά των Κομμάτων', blurb: 'Πόσα χρωστούν τα κόμματα, σε ποιον, και ποιος τα ελέγχει.' }
];

const PAGES = [
  { slug: '',           sections: ['hero', 'hub'],           nav: 'Αρχική',
    title: 'Νομόσιο — Η Ζυγαριά του Νόμου',
    desc: 'Υπηρετεί ο νόμος εμάς ή αυτούς που κυβερνούν; Η ζυγαριά κρίνει μόνο με αποδείξεις, και σου δείχνει από πού τις πήρε.' },
  { slug: 'tekmiria',   sections: ['exhibitHub'],            nav: 'Τεκμήρια',
    title: 'Τα Τεκμήρια — Νομόσιο',
    desc: 'Δέκα θέματα: σκάνδαλα, νόμοι, δημόσιο χρήμα, κυβέρνηση, επιτήρηση, σύνορα, υγεία, όπλα, κόμματα. Για καθένα, από πού το ξέρουμε.' },
  { slug: 'radar',      sections: ['radar'],                 nav: 'Ραντάρ',
    title: 'Το Ραντάρ — Νομόσιο',
    desc: 'Όσα ακούγονται και δεν ξέρουμε αν ισχύουν. Τι αποδεικνύεται, τι όχι, και ποιος κερδίζει. Τίποτα από εδώ δεν μετράει στη ζυγαριά.' },
  { slug: 'methodos',   sections: ['methodos'],              nav: 'Η Μέθοδος',
    title: 'Η Μέθοδος — Νομόσιο',
    desc: 'Πώς βγαίνει ο αριθμός της ζυγαριάς, βήμα βήμα — και τι δεν μετράμε ποτέ.' },
  { slug: 'erotiseis',  sections: ['faq'],                   nav: 'Ερωτήσεις',
    title: 'Συχνές Ερωτήσεις — Νομόσιο',
    desc: 'Ποιος αποφασίζει τι είναι καλό και τι κακό; Είστε με κάποιο κόμμα; Κάνετε λάθη; Οι απαντήσεις μας.' },
  { slug: 'arxaioi',    sections: ['synedrio', 'thesmoi'],   nav: 'Οι Αρχαίοι',
    title: 'Το Συνέδριο των Αρχαίων — Νομόσιο',
    desc: 'Δέκα αρχαίοι που δεν αγοράζονται. Τι έλεγαν, από ποιο βιβλίο το ξέρουμε, και πώς έλεγχαν τους άρχοντες τότε.' },
  { slug: 'symmetoxi',  sections: ['symmetoxi', 'stirixi'],  nav: 'Συμμετοχή',
    title: 'Συμμετοχή — Νομόσιο',
    desc: 'Δήλωσε ΠΑΡΩΝ, μάθε πρώτος τι αλλάζει, στήριξε το Νομόσιο.' },
  { slug: 'kiniseis',   sections: ['kiniseis'],              nav: 'Κινήσεις',
    title: 'Έξυπνες Κινήσεις — Νομόσιο',
    desc: 'Τι μπορείς να κάνεις εσύ, νόμιμα, με βάση όσα ζυγίζει το Νομόσιο: βήματα, επίσημοι σύνδεσμοι, προθεσμίες. Όλες ανοιχτές για όλους.' }
];

EXHIBITS.forEach(ex => {
  PAGES.push({
    slug: 'tekmiria/' + ex.slug,
    sections: [ex.slug],
    hidden: true,
    title: ex.title + ' — Τεκμήρια — Νομόσιο',
    desc: ex.blurb
  });
});

/* Σε ποια σελίδα ζει κάθε ενότητα — για να ξαναγραφτούν οι εσωτερικοί σύνδεσμοι */
const SECTION_PAGE = { top: '/', hub: '/' };
PAGES.forEach(p => p.sections.forEach(sec => { SECTION_PAGE[sec] = '/' + p.slug; }));

/* Σε ποια σελίδα ζει κάθε τεκμήριο — για το πάνελ της ζυγαριάς */
const EV_PAGE = {
  idx: '/tekmiria/deiktes',
  case: '/tekmiria/skandala',
  law: '/tekmiria/nomoi',
  money: '/tekmiria/xrima',
  party: '/tekmiria/kommata',
  'pol:st': '/tekmiria/epitirisi',
  'pol:z': '/tekmiria/synora',
  'pol:h': '/tekmiria/ygeia',
  'pol:th': '/tekmiria/geopolitiki'
};

/* ── 3. Δομικά κομμάτια που φτιάχνονται εδώ ───────────────────────────── */

function nav(currentSlug) {
  const items = PAGES.filter(p => !p.hidden).map(p => {
    const href = '/' + p.slug;
    const active = ('/' + currentSlug) === href ||
      (p.slug === 'tekmiria' && currentSlug.indexOf('tekmiria/') === 0);
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${p.nav}</a>`;
  }).join('\n      ');
  return `<nav aria-label="Κύρια πλοήγηση">
  <div class="nav-inner">
    <a class="logo" href="/"><svg class="lg-scale" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v18M7.5 21h9M12 5h7M12 5H5"/><path d="M5 5l-2.6 6h5.2L5 5zM2.4 11a2.6 2.6 0 0 0 5.2 0"/><path d="M19 5l-2.6 6h5.2L19 5zM16.4 11a2.6 2.6 0 0 0 5.2 0"/></svg> ΝΟΜΟΣΙΟ</a>
    <div class="links">
      ${items}
    </div>
  </div>
</nav>`;
}

/* Η αρχική: κάρτες προς τις οκτώ περιοχές */
function homeHub() {
  const cards = [
    { href: '/tekmiria', t: 'Τα Τεκμήρια', d: 'Όλα όσα ζυγίζουμε, σε δέκα θέματα: σκάνδαλα, νόμοι, χρήμα, υγεία, σύνορα και άλλα.', i: '📚' },
    { href: '/methodos', t: 'Η Μέθοδος', d: 'Πώς βγαίνει ο αριθμός της ζυγαριάς, βήμα βήμα. Και τι δεν μετράμε ποτέ.', i: '⚖️' },
    { href: '/radar', t: 'Το Ραντάρ', d: 'Όσα ακούγονται και δεν ξέρουμε αν ισχύουν. Τι αποδεικνύεται, τι όχι, ποιος κερδίζει.', i: '🔦' },
    { href: '/erotiseis', t: 'Ερωτήσεις', d: 'Ποιος αποφασίζει τι είναι καλό και τι κακό; Κάνετε λάθη; Οι απαντήσεις μας.', i: '❓' },
    { href: '/arxaioi', t: 'Οι Αρχαίοι', d: 'Δέκα αρχαίοι που δεν αγοράζονται. Τι έλεγαν, και πώς έλεγχαν τους άρχοντες.', i: '🏛️' },
    { href: '/kiniseis', t: 'Έξυπνες Κινήσεις', d: 'Τι μπορείς να κάνεις εσύ με τον νόμο: βήματα και επίσημοι σύνδεσμοι. Όλες ανοιχτές για όλους.', i: '🧭' },
    { href: '/symmetoxi', t: 'Συμμετοχή', d: 'Δήλωσε ΠΑΡΩΝ και μάθε πρώτος τι αλλάζει. Χωρίς εσένα δεν κουνιέται τίποτα.', i: '✊' }
  ];
  return `<section id="hub">
  <div class="wrap">
    <div class="eyebrow">Από πού να αρχίσεις</div>
    <div class="section-head"><h2>Διάλεξε τι θέλεις να δεις</h2></div>
    <div class="hub-grid">
      ${cards.map(c => `<a class="hub-card" href="${c.href}">
        <span class="hub-ico"${c.s ? ` style="${c.s}"` : ''} aria-hidden="true">${c.i}</span>
        <h3>${c.t}</h3>
        <p>${c.d}</p>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>`;
}

/* Η σελίδα-ευρετήριο των τεκμηρίων */
function exhibitHub() {
  return `<section id="exhibitHub">
  <div class="wrap">
    <div class="eyebrow">Τα Τεκμήρια</div>
    <div class="section-head"><h2>Δέκα θέματα — και για καθένα, από πού το ξέρουμε</h2></div>
    <p class="lead">Κάθε στοιχείο παίρνει βαθμό από −10 έως +10. Τον βαθμό δεν τον βάζουμε με το μάτι: βγαίνει από δικαστικές αποφάσεις, εκθέσεις και μετρήσεις που έκαναν άλλοι. Διάλεξε θέμα — ή δες πρώτα <a href="/methodos">πώς ζυγίζουμε</a>.</p>
    <div class="hub-grid">
      ${EXHIBITS.map(ex => `<a class="hub-card" href="/tekmiria/${ex.slug}">
        <span class="hub-ico" style="font-family:'GFS Didot',serif;color:var(--bronze)" aria-hidden="true">${ex.letter}</span>
        <h3>${ex.title}</h3>
        <p>${ex.blurb}</p>
      </a>`).join('\n      ')}
    </div>
  </div>
</section>`;
}

/* Πλοήγηση «προηγούμενο / επόμενο τεκμήριο» στο τέλος κάθε υποσελίδας */
function exhibitPager(slug) {
  const i = EXHIBITS.findIndex(e => e.slug === slug);
  if (i < 0) return '';
  const prev = EXHIBITS[i - 1], next = EXHIBITS[i + 1];
  return `<div class="wrap" style="display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between;padding-bottom:70px">
  ${prev ? `<a class="vbtn" style="text-decoration:none" href="/tekmiria/${prev.slug}">← ${prev.letter} ${prev.nav}</a>` : '<span></span>'}
  <a class="vbtn" style="text-decoration:none;border-color:var(--bronze);color:var(--bronze-ink)" href="/tekmiria">Όλα τα τεκμήρια</a>
  ${next ? `<a class="vbtn" style="text-decoration:none" href="/tekmiria/${next.slug}">${next.letter} ${next.nav} →</a>` : '<span></span>'}
</div>`;
}

/* Οι Έξυπνες Κινήσεις ως κάρτες. Το φίλτρο «ποιον αφορά» διαβάζει το data-who. */
const THEMES = { work: 'Δουλειά και εισόδημα', home: 'Σπίτι και χαρτιά', health: 'Υγεία και πρόστιμα', rights: 'Ψήφος και δικαιώματα' };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const httpsOnly = u => /^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : '';
const localOnly = u => /^\/[a-z0-9\/#-]*$/.test(u || '') ? u : '';
const day = d => d ? new Date(d).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

function moveCard(m) {
  const act = httpsOnly(m.actionUrl), dl = httpsOnly(m.deadline && m.deadline.sourceUrl), ref = localOnly(m.ref);
  const who = m.who || [];
  return `<article class="card mv-card" id="mv-${esc(m.id)}" data-who="${esc(who.join('|'))}">
        <div class="meta"><span class="chip">${esc(THEMES[m.theme] || '')}</span></div>
        <h3>${esc(m.title)}</h3>
        <p class="mv-who">Αφορά: ${who.map(esc).join(', ')}</p>
        <p class="sum">${esc(m.benefit)}</p>
        <ol class="mv-steps">${(m.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        ${m.watchOut ? `<p class="mv-watch"><b>Πρόσεξε:</b> ${esc(m.watchOut)}</p>` : ''}
        ${m.deadline && m.deadline.text ? `<p class="mv-deadline"><b>Προθεσμία:</b> ${esc(m.deadline.text)}${dl ? ` <a href="${esc(dl)}" target="_blank" rel="noopener">(πηγή)</a>` : ''}</p>` : ''}
        ${act ? `<a class="vbtn mv-go" href="${esc(act)}" target="_blank" rel="noopener">Κάνε το στην επίσημη σελίδα</a>` : ''}
        <details><summary>Από πού το ξέρουμε</summary><ul>${(m.sources || []).map(s => {
          const u = httpsOnly(s.url);
          return `<li>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}: ${esc(s.confirms)}</li>`;
        }).join('')}</ul></details>
        <div class="srcs">Βασίζεται σε: ${esc(m.law || '')}${ref ? ` · <a href="${esc(ref)}">δες το στο Νομόσιο</a>` : ''} · Πηγές ελεγμένες στις ${esc(day(m.checkedOn))}</div>
      </article>`;
}

/* ── 4. Παραγωγή ──────────────────────────────────────────────────────── */

/* Οι εσωτερικοί σύνδεσμοι #ενότητα δείχνουν σε άλλη σελίδα όταν χρειάζεται */
function fixLinks(html, onPage) {
  return html.replace(/href="#([a-z]+)"/g, (full, id) => {
    if (onPage.has(id)) return full;                 // ίδια σελίδα → μένει άγκυρα
    const page = SECTION_PAGE[id];
    return page ? `href="${page}"` : full;           // αλλιώς → σύνδεσμος σελίδας
  });
}

function page(p) {
  const onPage = new Set(p.sections.concat(['privacy', 'top']));
  const body = p.sections.map(sec => {
    if (sec === 'hero') return HERO;
    if (sec === 'hub') return homeHub();
    if (sec === 'exhibitHub') return exhibitHub();
    if (sec === 'kiniseis') return (SECTIONS[sec] || '').replace(/<!-- ΚΙΝΗΣΕΙΣ:[^>]*-->/, () => MOVES.map(moveCard).join('\n      '));
    return SECTIONS[sec] || '';
  }).filter(Boolean).join('\n\n' + MEANDER + '\n\n');

  const isExhibit = p.slug.indexOf('tekmiria/') === 0;
  const pager = isExhibit ? exhibitPager(p.slug.split('/')[1]) : '';
  const canonical = 'https://nomosio.gr/' + p.slug;
  const depth = p.slug ? p.slug.split('/').length : 0;

  return `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${p.title}</title>
<meta name="description" content="${p.desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${p.title}">
<meta property="og:description" content="${p.desc}">
<meta property="og:type" content="website">
<meta property="og:locale" content="el_GR">
<meta property="og:url" content="${canonical}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%96%EF%B8%8F%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=GFS+Didot&family=Literata:opsz,wght@7..72,400;7..72,600;7..72,700&family=Source+Sans+3:wght@400;600;700&display=swap">
<link rel="stylesheet" href="/assets/app.css?v=${CSS_V}">
</head>
<body>
${fixLinks(nav(p.slug), onPage)}

<button id="toTop" aria-label="Επιστροφή στην κορυφή">↑</button>

${fixLinks(body, onPage)}

${pager}

${fixLinks(FOOTER, onPage)}

<script>window.__EV_PAGE=${JSON.stringify(EV_PAGE)};</script>
<script src="/assets/app.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'assets', 'app.css'), CSS);
fs.writeFileSync(path.join(OUT, 'assets', 'app.js'), JS);

/* Το GitHub Pages δεν κάνει ανακατευθύνσεις από ρυθμίσεις· τις φτιάχνουμε ως σελίδες.
   Οι παλιές σελίδες της συνδρομής δείχνουν πλέον στις ανοιχτές κινήσεις. */
const REDIRECTS = { paixnidia: '/', oroi: '/kiniseis' };
Object.entries(REDIRECTS).forEach(([from, to]) => {
  fs.mkdirSync(path.join(OUT, from), { recursive: true });
  fs.writeFileSync(path.join(OUT, from, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Νομόσιο</title><link rel="canonical" href="https://nomosio.gr${to}"><meta http-equiv="refresh" content="0; url=${to}"><a href="${to}">nomosio.gr${to}</a>\n`);
});
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

let n = 0;
PAGES.forEach(p => {
  const dir = p.slug ? path.join(OUT, ...p.slug.split('/')) : OUT;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(p));
  n++;
});

/* Χάρτης για τις μηχανές αναζήτησης */
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  PAGES.map(p => `  <url><loc>https://nomosio.gr/${p.slug}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'),
  'User-agent: *\nAllow: /\nSitemap: https://nomosio.gr/sitemap.xml\n');

console.log('έγιναν ' + n + ' σελίδες · app.css ' + CSS.length + ' (v' + CSS_V + ') · app.js ' + JS.length + ' (v' + JS_V + ') bytes');
