import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />

      <section className="hero">
        <div className="container">
          <div className="hero-badge">
            <span className="dot" />
            Καθημερινά από Εθνικό Τυπογραφείο, opengov.gr &amp; Διαύγεια
          </div>
          <h1>
            Οι νόμοι αλλάζουν κάθε μέρα.
            <br />
            <span className="accent">Εσύ θα το μάθεις πρώτος.</span>
          </h1>
          <p className="sub">
            Το Nomosio παρακολουθεί κάθε νέο νομοσχέδιο και νόμο — και σου λέει
            τι σημαίνει για σένα, τι προθεσμίες έχεις και ποιες νόμιμες κινήσεις
            σε συμφέρουν.
          </p>

          <div className="hero-card">
            <span className="eyebrow">Για κάθε πολίτη</span>
            <h3>Μάθε ό,τι σε αφορά. Απλά.</h3>
            <p className="muted">
              Χωρίς νομικά ελληνικά. Χωρίς να το ακούσεις τυχαία στις ειδήσεις.
            </p>
            <ul>
              <li>Καθημερινή ενημέρωση σε απλά ελληνικά</li>
              <li>Ειδοποίηση πριν από κάθε προθεσμία</li>
              <li>Νόμιμες έξυπνες κινήσεις που σε συμφέρουν</li>
              <li>Ρώτα το Nomosio AI με δικά σου λόγια</li>
            </ul>
            <div className="card-footer">
              <a href="/dashboard">Ξεκίνα δωρεάν →</a>
              <span className="price">Pro €5,90/μήνα</span>
            </div>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="container">
          <span className="eyebrow">Πώς λειτουργεί</span>
          <h2>Από τη Βουλή στην οθόνη σου.</h2>
          <p className="sub">Κάθε μέρα, χωρίς να κάνεις τίποτα.</p>

          <div className="how-grid">
            <div className="how-col">
              <span className="eyebrow">Συλλογή</span>
              <h4>Διαβάζουμε τα πάντα</h4>
              <p>
                Κάθε ψηφισμένος νόμος από το Εθνικό Τυπογραφείο και κάθε νέο
                νομοσχέδιο σε διαβούλευση από το opengov.gr — αυτόματα, κάθε
                πρωί.
              </p>
            </div>
            <div className="how-col">
              <span className="eyebrow">Ανάλυση</span>
              <h4>Το μεταφράζουμε για σένα</h4>
              <p>
                Κάθε αλλαγή αποδίδεται σε απλά ελληνικά — τι σημαίνει πρακτικά
                για σένα, με παραπομπή στην επίσημη πηγή.
              </p>
            </div>
            <div className="how-col">
              <span className="eyebrow">Ειδοποίηση</span>
              <h4>Σε βρίσκει μόνο του</h4>
              <p>
                Ό,τι σε αφορά έρχεται σε σένα: προθεσμίες πριν λήξουν, ευκαιρίες
                πριν χαθούν, αλλαγές πριν σε προλάβουν.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing-strip">
        <div className="container">
          <span className="eyebrow">Τιμολόγηση</span>
          <h2>
            Ξεκίνα δωρεάν.
            <br />
            Αναβάθμισε αν χρειαστεί.
          </h2>
          <p className="sub">
            Δωρεάν ή με συνδρομή. Χωρίς κρυφές χρεώσεις. Ακύρωση οποτεδήποτε.
          </p>

          <div className="chips">
            <div className="chip">
              <span className="ico">📰</span>
              Καθημερινή ενημέρωση: ΦΕΚ, διαβουλεύσεις &amp; εγκύκλιοι
            </div>
            <div className="chip">
              <span className="ico">⚡</span>
              Εξήγηση σε απλά ελληνικά
            </div>
            <div className="chip">
              <span className="ico">💡</span>
              Έξυπνες κινήσεις &amp; προθεσμίες
            </div>
            <div className="chip">
              <span className="ico">⚖️</span>
              Nomosio AI με πραγματικές παραπομπές
            </div>
          </div>

          <div className="cta-row">
            <a className="btn btn-primary" href="/dashboard">Ξεκίνα Δωρεάν — €0</a>
            <a className="btn btn-outline" href="/pricing">Δες όλα τα πλάνα →</a>
          </div>
          <div className="assure">
            <span><span className="tick">✓</span> Δωρεάν</span>
            <span><span className="tick">✓</span> Χωρίς πιστωτική κάρτα</span>
            <span><span className="tick">✓</span> Ακύρωση οποτεδήποτε</span>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
