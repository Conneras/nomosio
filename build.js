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
  { slug: 'deiktes',     letter: 'Α΄', nav: 'Δείκτες',      title: 'Οι Δείκτες',            blurb: 'Τι μετρούν οι ανεξάρτητοι διεθνείς θεσμοί για την Ελλάδα.' },
  { slug: 'skandala',    letter: 'Β΄', nav: 'Σκάνδαλα',     title: 'Τα Σκάνδαλα',           blurb: 'Δεν ρωτάμε μόνο τι συνέβη — ρωτάμε αν λογοδότησε κανείς.' },
  { slug: 'nomoi',       letter: 'Γ΄', nav: 'Νόμοι',        title: 'Οι Νόμοι',              blurb: 'Ποιον υπηρετεί ο κάθε νόμος, με βάση ό,τι τεκμηριωμένα ακολούθησε.' },
  { slug: 'xrima',       letter: 'Δ΄', nav: 'Χρήμα',        title: 'Το Δημόσιο Χρήμα',      blurb: 'Έργα, κονδύλια και δημοσιονομικές διορθώσεις — κάθε ευρώ με πηγή.' },
  { slug: 'kyvernisi',   letter: 'Ε΄', nav: 'Κυβέρνηση',    title: 'Η Κυβέρνηση',           blurb: 'Ποιοι αποφασίζουν σήμερα και τι συνέβη επί της θητείας τους.' },
  { slug: 'epitirisi',   letter: 'ΣΤ΄', nav: 'Επιτήρηση',   title: 'Ελευθερίες & Επιτήρηση', blurb: 'Ταυτότητες, κάμερες, αλγόριθμοι — και τι από αυτά διαψεύστηκε.' },
  { slug: 'synora',      letter: 'Ζ΄', nav: 'Σύνορα',       title: 'Σύνορα & Δικαιώματα',   blurb: 'Δικαστικές κρίσεις και πορίσματα ανεξάρτητων αρχών.' },
  { slug: 'ygeia',       letter: 'Η΄', nav: 'Υγεία',        title: 'Η Υγεία',               blurb: 'Το ΕΣΥ, ο καρκίνος, τα φάρμακα — με στοιχεία ΟΟΣΑ και Κομισιόν.' },
  { slug: 'geopolitiki', letter: 'Θ΄', nav: 'Γεωπολιτική',  title: 'Γεωπολιτική & Άμυνα',   blurb: 'Συμμαχίες, εξοπλισμοί, εμπόριο — και γιατί δεν βαθμολογούνται όλα.' },
  { slug: 'kommata',     letter: 'Ι΄', nav: 'Κόμματα',      title: 'Τα Οικονομικά των Κομμάτων', blurb: 'Ποιος χρωστά, σε ποιον, και ποιος ελέγχει.' }
];

const PAGES = [
  { slug: '',           sections: ['hero', 'hub'],           nav: 'Αρχική',
    title: 'Νομόσιο — Η Ζυγαριά του Νόμου',
    desc: 'Υπηρετεί ο νόμος τους πολίτες — ή τους κυβερνώντες; Η ζυγαριά ζυγίζει μόνο τεκμηριωμένα στοιχεία, με ανοιχτή μεθοδολογία και πηγές για όλα.' },
  { slug: 'tekmiria',   sections: ['exhibitHub'],            nav: 'Τεκμήρια',
    title: 'Τα Τεκμήρια — Νομόσιο',
    desc: 'Δέκα ενότητες τεκμηρίων: δείκτες, σκάνδαλα, νόμοι, δημόσιο χρήμα, κυβέρνηση, επιτήρηση, σύνορα, υγεία, γεωπολιτική, κόμματα.' },
  { slug: 'radar',      sections: ['radar'],                 nav: 'Ραντάρ',
    title: 'Το Ραντάρ — Νομόσιο',
    desc: 'Οι ισχυρισμοί που κυκλοφορούν, περασμένοι από το ίδιο κόσκινο: τι τεκμηριώνεται, τι όχι, ποιος ωφελείται. Τίποτα εδώ δεν αγγίζει τη ζυγαριά.' },
  { slug: 'paixnidia',  sections: ['paixnidia'],             nav: 'Παιχνίδια',
    title: 'Τα Παιχνίδια — Νομόσιο',
    desc: 'Τρία σύντομα παιχνίδια φτιαγμένα από τα τεκμήρια της σελίδας. Δοκίμασε πόσο μοιάζει η κρίση σου με τα στοιχεία.' },
  { slug: 'methodos',   sections: ['methodos'],              nav: 'Η Μέθοδος',
    title: 'Η Μέθοδος — Νομόσιο',
    desc: 'Πώς υπολογίζεται ο δείκτης ισορροπίας: τέσσερις πυλώνες, βάρη, βαθμοί από −10 έως +10, και τι δεν μετράει ποτέ.' },
  { slug: 'erotiseis',  sections: ['faq'],                   nav: 'Ερωτήσεις',
    title: 'Συχνές Ερωτήσεις — Νομόσιο',
    desc: 'Ποιος αποφασίζει τι είναι υπέρ και τι κατά; Είστε με την αριστερά ή τη δεξιά; Μπορεί να κάνετε λάθος; Οι απαντήσεις με τα ίδια τεκμήρια.' },
  { slug: 'arxaioi',    sections: ['synedrio', 'thesmoi'],   nav: 'Οι Αρχαίοι',
    title: 'Το Συνέδριο των Αρχαίων — Νομόσιο',
    desc: 'Δέκα κριτές που δεν δωροδοκούνται, με ελεγμένα αποφθέγματα και πηγές — και οι θεσμοί λογοδοσίας της αρχαίας Αθήνας δίπλα στο σήμερα.' },
  { slug: 'symmetoxi',  sections: ['symmetoxi', 'plus'],     nav: 'Συμμετοχή',
    title: 'Συμμετοχή — Νομόσιο',
    desc: 'Δήλωσε ΠΑΡΩΝ, μπες στη λίστα και δες τι έρχεται. Η ζυγαριά ισορροπεί μόνο αν βάλεις το χέρι σου.' }
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
    { href: '/tekmiria', t: 'Τα Τεκμήρια', d: 'Δέκα ενότητες με στοιχεία και πηγές — από τους διεθνείς δείκτες ώς τα οικονομικά των κομμάτων.', i: '📚' },
    { href: '/methodos', t: 'Η Μέθοδος', d: 'Πώς βγαίνει ο αριθμός. Τέσσερις πυλώνες, ανοιχτός τύπος, και τι δεν μετράει ποτέ.', i: '⚖️' },
    { href: '/paixnidia', t: 'Τα Παιχνίδια', d: 'Ζύγισε εσύ τα τεκμήρια και δες πόσο μοιάζει η κρίση σου με τα στοιχεία.', i: '🎲' },
    { href: '/radar', t: 'Το Ραντάρ', d: 'Οι «θεωρίες» στο κόσκινο: τι τεκμηριώνεται, τι όχι, ποιος ωφελείται.', i: '🔦' },
    { href: '/erotiseis', t: 'Ερωτήσεις', d: 'Ποιος αποφασίζει τι είναι υπέρ και τι κατά; Μπορεί να κάνετε λάθος;', i: '❓' },
    { href: '/arxaioi', t: 'Οι Αρχαίοι', d: 'Δέκα κριτές που δεν δωροδοκούνται — και οι θεσμοί που είχαν εκείνοι.', i: '🏛️' },
    { href: '/symmetoxi', t: 'Συμμετοχή', d: 'Δήλωσε ΠΑΡΩΝ και μείνε στη λίστα. Η ζυγαριά ισορροπεί μόνο με εσένα.', i: '✊' }
  ];
  return `<section id="hub">
  <div class="wrap">
    <div class="eyebrow">Από πού να αρχίσεις</div>
    <div class="section-head"><h2>Όλα με πηγές — διάλεξε τι θέλεις να δεις</h2></div>
    <div class="games" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${cards.map(c => `<a class="gcard" href="${c.href}">
        <span class="g-ico" aria-hidden="true">${c.i}</span>
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
    <div class="section-head"><h2>Δέκα ενότητες — κάθε στοιχείο με τη πηγή του</h2></div>
    <p class="lead">Κάθε τεκμήριο παίρνει βαθμό από −10 έως +10 με βάση τεκμηριωμένες κρίσεις τρίτων, όχι τη γνώμη μας. Διάλεξε ενότητα — ή δες πρώτα <a href="/methodos">πώς ζυγίζουμε</a>.</p>
    <div class="games" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
      ${EXHIBITS.map(ex => `<a class="gcard" href="/tekmiria/${ex.slug}">
        <span class="g-ico" style="font-family:'GFS Didot',serif;color:var(--bronze)" aria-hidden="true">${ex.letter}</span>
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
