/*
 * Προ-απόδοση των τεκμηρίων
 * ─────────────────────────
 * Τα τεκμήρια (δείκτες, σκάνδαλα, νόμοι, χρήμα, πολιτικές, κόμματα, Ραντάρ, FAQ,
 * αρχαίοι, θεσμοί) γράφονται από το ίδιο το script της σελίδας με setHTML(id, html).
 * Χωρίς JavaScript ο επισκέπτης έβλεπε άδειες σελίδες.
 *
 * Αντί να ξαναγραφτούν τα ίδια πρότυπα και στο build (δύο αλήθειες που θα ξέφευγαν),
 * τρέχουμε ΤΟ ΙΔΙΟ script εδώ, μέσα σε ένα ψεύτικο DOM που δεν κάνει τίποτα άλλο από
 * το να κρατά ό,τι ανατίθεται σε innerHTML. Ό,τι πιάσουμε, μπαίνει έτοιμο στο HTML.
 * Στον browser το script ξανατρέχει και γράφει το ίδιο ακριβώς markup.
 */
const vm = require('vm');

/* Ένας «κόμβος» που δέχεται τα πάντα και δεν κάνει τίποτα: κάθε ιδιότητα ή κλήση
   επιστρέφει άλλον τέτοιο κόμβο, ώστε αλυσίδες σαν el.parentElement.classList.add(...)
   να μη σπάνε το τρέξιμο. Μόνο το innerHTML το κρατάμε. */
function fakeNode(id, captured) {
  const state = { html: '' };
  const handler = {
    get(_t, prop) {
      if (prop === 'innerHTML' || prop === 'outerHTML') return state.html;
      if (prop === 'id') return id || '';
      if (prop === 'length') return 0;
      if (prop === 'children' || prop === 'childNodes' || prop === 'classList' && false) return [];
      if (prop === 'textContent' || prop === 'value' || prop === 'tagName') return '';
      if (prop === 'hidden' || prop === 'checked' || prop === 'inert') return false;
      if (prop === 'dataset' || prop === 'style') return fakeNode('', captured);
      if (prop === 'parentElement' || prop === 'parentNode' || prop === 'firstElementChild') return fakeNode('', captured);
      if (prop === Symbol.iterator) return function* () {};
      if (prop === Symbol.toPrimitive) return () => '';
      if (prop === 'then') return undefined;          // να μη θεωρηθεί promise
      if (prop === 'getBoundingClientRect') return () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
      if (prop === 'getAttribute') return () => null;
      if (prop === 'matches' || prop === 'contains') return () => false;
      if (prop === 'querySelector' || prop === 'closest') return () => null;
      if (prop === 'querySelectorAll' || prop === 'getElementsByClassName') return () => [];
      return fakeNode('', captured);
    },
    set(_t, prop, value) {
      if (prop === 'innerHTML') {
        state.html = String(value);
        if (id) captured[id] = state.html;
      }
      return true;
    },
    apply() { return fakeNode('', captured); },
  };
  return new Proxy(function () {}, handler);
}

function prerender(js, expectedIds) {
  const captured = Object.create(null);
  const docBase = {
    getElementById: (id) => fakeNode(id, captured),
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => fakeNode('', captured),
    createTextNode: () => fakeNode('', captured),
    addEventListener: () => {},
    removeEventListener: () => {},
    documentElement: fakeNode('', captured),
    body: fakeNode('', captured),
    head: fakeNode('', captured),
    scripts: [],
    readyState: 'loading',
    title: '',
  };
  /* Ό,τι άλλο ζητήσει το script από το document (createElementNS, fonts, κ.λπ.)
     γίνεται κι αυτό αδρανής κόμβος, για να μη σταματά το τρέξιμο. */
  const doc = new Proxy(docBase, {
    get: (t, p) => (p in t ? t[p] : fakeNode('', captured)),
    set: (t, p, v) => { t[p] = v; return true; },
  });
  const win = {
    document: doc,
    location: { href: 'https://nomosio.gr/', pathname: '/', hash: '', search: '' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, addListener: () => {} }),
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    ResizeObserver: class { observe() {} disconnect() {} },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollTo: () => {},
    scrollY: 0,
    innerWidth: 1280,
    innerHeight: 900,
    getComputedStyle: () => fakeNode('', captured),
    navigator: { userAgent: 'nomosio-build', language: 'el' },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    __EV_PAGE: {},
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;

  let error = null;
  try {
    vm.createContext(win);
    new vm.Script(js, { filename: 'nomosio-app.js' }).runInContext(win, { timeout: 20000 });
  } catch (e) {
    error = e;
  }

  const missing = expectedIds.filter((id) => !captured[id] || !captured[id].trim());
  if (missing.length) {
    const why = error ? `\nΤο script σταμάτησε: ${error.message}` : '';
    throw new Error(`Η προ-απόδοση δεν έπιασε: ${missing.join(', ')}${why}`);
  }
  return captured;
}

module.exports = { prerender };
