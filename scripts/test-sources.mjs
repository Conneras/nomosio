// Πραγματικά τεστ και για τις 3 πηγές. Τρέξε: npm run test:sources
// Αν κάποιο αποτύχει, ΔΕΝ δημοσιεύουμε περιεχόμενο από αυτή την πηγή. Ποτέ επινοημένα δεδομένα.
import { searchFek } from "../src/lib/sources/et.js";
import { searchDiavgeia } from "../src/lib/sources/diavgeia.js";
import { fetchOpengovFeed } from "../src/lib/sources/opengov.js";

let failed = 0;

async function test(name, fn) {
  try {
    const out = await fn();
    if (!out || out.length === 0) throw new Error("κενό αποτέλεσμα");
    console.log(`✅ ${name}: ${out.length} αποτελέσματα. Πρώτο:`, JSON.stringify(out[0]).slice(0, 200));
  } catch (e) {
    failed++;
    console.error(`❌ ${name}: ${e.message}`);
  }
}

const year = new Date().getFullYear();
await test("ΦΕΚ Τεύχος Α (Εθνικό Τυπογραφείο)", () => searchFek({ year, issue: "01" }));
await test("Διαύγεια (εγκύκλιοι/αποφάσεις)", () => searchDiavgeia({ size: 5 }));
await test("opengov.gr (διαβουλεύσεις RSS)", () => fetchOpengovFeed());

process.exit(failed ? 1 : 0);
