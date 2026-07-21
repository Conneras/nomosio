"use client";

import { useState } from "react";

const faq = [
  {
    q: "Τι είναι οι «έξυπνες κινήσεις»;",
    a: "Τα νόμιμα «παραθυράκια» κάθε νόμου: ρυθμίσεις, εκπτώσεις, κίνητρα και μεταβατικές διατάξεις που μπορείς να αξιοποιήσεις — για σένα, το σπίτι ή τη δουλειά σου. Σου τις δείχνουμε με το όφελος σε ευρώ και τον σύνδεσμο της αίτησης, βήμα-βήμα. Όλα 100% νόμιμα, με παραπομπή στον νόμο.",
  },
  {
    q: "Πότε λαμβάνω την ενημέρωση;",
    a: "Σύνοψη κάθε Κυριακή στις 19:00 στο email σου, και ειδοποίηση email 2 μέρες πριν λήξει προθεσμία που σε αφορά (Pro). Μέσα στην εφαρμογή, το feed ενημερώνεται κάθε πρωί.",
  },
  {
    q: "Χρειάζεται κάρτα για να ξεκινήσω;",
    a: "Όχι — ξεκινάς εντελώς δωρεάν, χωρίς κάρτα. Κάρτα χρειάζεται μόνο αν επιλέξεις να αναβαθμίσεις σε Pro.",
  },
  {
    q: "Μπορώ να ακυρώσω οποτεδήποτε;",
    a: "Ναι, από τις Ρυθμίσεις, χωρίς καμία χρέωση ακύρωσης. Κρατάς την πρόσβαση μέχρι το τέλος της περιόδου που έχεις πληρώσει.",
  },
  {
    q: "Πόσο συχνά ενημερώνεται η βάση;",
    a: "Καθημερινά — κάθε πρωί αντλούμε τους νέους ψηφισμένους νόμους από το Εθνικό Τυπογραφείο, τις νέες διαβουλεύσεις από το opengov.gr και τις νέες εγκυκλίους από τη Διαύγεια, πάντα με τον αυθεντικό τίτλο και το πραγματικό ΦΕΚ ή σύνδεσμο.",
  },
  {
    q: "Παρέχεται τιμολόγιο;",
    a: "Ναι, αυτόματα στο email σου μετά από κάθε χρέωση, μέσω Stripe.",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="page-light">
      <div className="container" style={{ paddingTop: 28 }}>
        <a href="/" style={{ color: "var(--ink-600)", fontSize: 14 }}>← Αρχική</a>
      </div>

      <div className="page-head">
        <h1>Απλή τιμολόγηση.</h1>
        <p className="sub">
          Μία συνδρομή για να μη μαθαίνεις τα νέα των νόμων τυχαία — και να μη
          χάνεις ό,τι δικαιούσαι.
        </p>
        <div className="billing-toggle">
          <button className={annual ? "" : "active"} onClick={() => setAnnual(false)}>
            Μηνιαία χρέωση
          </button>
          <button className={annual ? "active" : ""} onClick={() => setAnnual(true)}>
            Ετήσια — 2 μήνες δώρο
          </button>
        </div>
      </div>

      <div className="container">
        <div className="plans">
          <div className="plan">
            <h3>Δωρεάν</h3>
            <p className="desc">Δες τι αλλάζει</p>
            <div className="price">
              €0 <small>για πάντα</small>
            </div>
            <div className="annual-note" />
            <ul>
              <li>Καθημερινή ενημέρωση: τι νέο δημοσιεύτηκε, σε απλά ελληνικά</li>
              <li>Εβδομαδιαία σύνοψη στο email σου</li>
              <li>1 έξυπνη κίνηση τον μήνα</li>
              <li>5 AI ερωτήσεις / μήνα</li>
            </ul>
            <a className="btn btn-light" href="/dashboard">Ξεκίνα δωρεάν</a>
          </div>

          <div className="plan pro">
            <span className="badge">Λιγότερο από έναν καφέ</span>
            <h3>Pro</h3>
            <p className="desc">Μη χάσεις ποτέ ευκαιρία ή προθεσμία</p>
            <div className="price">
              {annual ? "€4,10" : "€5,90"}{" "}
              <small>{annual ? "/ μήνα, χρέωση ετήσια" : "/ μήνα"}</small>
            </div>
            <div className="annual-note">
              {annual ? "€49/έτος — 2 μήνες δώρο" : ""}
            </div>
            <ul>
              <li>
                Προσωπικό «Σε αφορά»: οι αλλαγές που αγγίζουν τη δική σου ζωή,
                πρώτες και με τον λόγο
              </li>
              <li>Όλες οι έξυπνες κινήσεις — με οδηγίες βήμα-βήμα</li>
              <li>Ειδοποίηση στο email πριν από κάθε προθεσμία που σε αφορά</li>
              <li>Εβδομαδιαία σύνοψη στο email σου</li>
              <li>50 AI ερωτήσεις / μήνα</li>
            </ul>
            <a className="btn btn-primary" href="/dashboard">Ξεκίνα με Pro</a>
            <p className="under">Αν γλιτώσεις ένα πρόστιμο, βγήκε η χρονιά.</p>
          </div>
        </div>

        <div className="faq">
          <h2>Συχνές ερωτήσεις</h2>
          {faq.map((f) => (
            <div className="faq-item" key={f.q}>
              <h4>{f.q}</h4>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
