# Nomosio — GUIDE (το μοναδικό doc)

Νέο, καθαρό rebuild του nomosio.gr. Repo: `Conneras/Nomosio`, commits κατευθείαν στο `main`.
Κανόνας #1: **ΤΙΠΟΤΑ επινοημένο.** Ό,τι εμφανίζεται στον χρήστη προέρχεται από επίσημη πηγή με πραγματικό link/ΦΕΚ. Αν μια πηγή δεν απαντά, δεν δείχνουμε τίποτα.

## 1. Πηγές — επιβεβαιωμένες με πραγματικά τεστ (21/07/2026)

| Πηγή | Τι δίνει | Endpoint | Τεστ |
|---|---|---|---|
| Εθνικό Τυπογραφείο (ΦΕΚ) | Ψηφισμένοι νόμοι, τεύχη Α/Β | `POST https://searchetv99.azurewebsites.net/api/simplesearch` (JSON, χωρίς κλειδί) | ✅ curl 21/07/2026 |
| Διαύγεια | Εγκύκλιοι & αποφάσεις δημοσίου | `GET https://diavgeia.gov.gr/opendata/search` (JSON, χωρίς κλειδί) | ✅ curl 21/07/2026 |
| opengov.gr | Δημόσιες διαβουλεύσεις | `GET https://archive.opengov.gr/home/feed` (RSS· το opengov.gr/home/feed κάνει 301 εδώ) | ✅ curl 21/07/2026 |

- ΦΕΚ σελίδα: `https://search.et.gr/fek/?fekId=<id>` — PDF: `https://ia37rg02wpsa01.blob.core.windows.net/fek/<τεύχος2ψ>/<έτος>/<έτος><τεύχος2ψ><αριθμός5ψ>.pdf`
- Clients: `src/lib/sources/{et,diavgeia,opengov}.js`
- Τεστ οποιαδήποτε στιγμή: `npm run test:sources` — αν αποτύχει πηγή, ΔΕΝ δημοσιεύουμε από αυτήν.

## 2. Stack

Next.js 15 (App Router, JS), plain CSS (`src/app/globals.css`). Hosting: Vercel. (Επόμενη φάση: Supabase auth/db, Stripe, DeepSeek + Claude APIs για Nomosio AI.)

## 3. Σελίδες (πιστή αναδημιουργία από τα screenshots του παλιού live site)

- `/` — hero (badge πηγών, «Οι νόμοι αλλάζουν κάθε μέρα.»), Πώς λειτουργεί (Συλλογή/Ανάλυση/Ειδοποίηση), τιμολόγηση-strip, footer
- `/pricing` — Δωρεάν €0 / Pro €5,90/μήνα ή ετήσια €49 (€4,10/μήνα, 2 μήνες δώρο), FAQ ×6
- `/about` — Trade Vessel P.C., Σαντορίνη, Κωνσταντίνος Δαρζέντας
- `/terms`, `/privacy` — πλήρη κείμενα (GDPR, Ν. 4624/2019)
- `/dashboard` — placeholder «έρχεται» (επόμενη φάση)

## 4. Εκκρεμότητες (χρειάζονται από τον χρήστη)

- [ ] DeepSeek + Claude API keys (δεν βρέθηκαν σε .env του παλιού project)
- [ ] Supabase project keys (νέο ή το παλιό;)
- [ ] Stripe keys (πλάνα €5,90/μήνα, €49/έτος)
- [ ] Σύνδεση Vercel στο repo Conneras/Nomosio + domain nomosio.gr

## 5. Επόμενη φάση

Auth (email + Google OAuth), dashboard (Ενημέρωση, Nomosio AI, Έξυπνες Κινήσεις, Ειδοποιήσεις, Ρυθμίσεις), καθημερινό cron άντλησης από τις 3 πηγές, εβδομαδιαίο email Κυριακή 19:00, ειδοποίηση 2 μέρες πριν από προθεσμία (Pro).
