# Νομόσιο — Η Ζυγαριά του Νόμου

Μη κομματική πρωτοβουλία πολιτών: μια ζυγαριά δικαιοσύνης που γέρνει μόνο με **τεκμηριωμένα στοιχεία** — διεθνείς δείκτες, νόμοι, σκάνδαλα, δημόσιο χρήμα — με ανοιχτή μεθοδολογία και πηγές για όλα, υπό το βλέμμα του Συνεδρίου των Αρχαίων.

- **Πηγή σελίδας:** `index.html` (artifact format — χωρίς doctype/head wrapper)
- **Build:** `node build.js` → `public/index.html` (πλήρης standalone σελίδα για το web)
- **Deploy:** GitHub Pages — σε κάθε push στο `main` το `.github/workflows/pages.yml` τρέχει `node build.js` και δημοσιεύει το `public/`. Χωρίς βάση δεδομένων και χωρίς διακομιστή.
- **Έξυπνες Κινήσεις:** `data/moves.json` → γράφονται στη σελίδα /kiniseis από το build. Έλεγχος: `node tools/check-moves.js --check`
- **Στήριξη:** Stripe Payment Link στην ενότητα #stirixi του `index.html`
- **Λίστα email:** `NEWSLETTER_URL` στο `index.html` (όσο είναι κενό, η φόρμα δεν φαίνεται)
- **Τοπικός έλεγχος:** `NOMOSIO_ALLOW_TODO=1 node build.js && node .qa/server.js` → http://localhost:8317
- **Άδεια περιεχομένου:** CC BY 4.0 με αναφορά «nomosio.gr»

Τελευταία ενημέρωση δεδομένων: 31 Αυγούστου 2026.

«Μάχεσθαι χρὴ τὸν δῆμον ὑπὲρ τοῦ νόμου ὅκωσπερ τείχεος.» — Ἡράκλειτος
