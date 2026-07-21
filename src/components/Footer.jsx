import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Logo />
            <p className="tagline">
              Καθημερινή ενημέρωση για ό,τι αλλάζει στους νόμους — σε απλά
              ελληνικά, για κάθε πολίτη.
            </p>
            <div className="mail">
              <a href="mailto:info@nomosio.gr">info@nomosio.gr</a>
              <a href="mailto:support@nomosio.gr">support@nomosio.gr</a>
            </div>
          </div>
          <div>
            <h5>Πλατφόρμα</h5>
            <ul>
              <li><a href="/#how">Πώς λειτουργεί</a></li>
              <li><a href="/pricing">Τιμές &amp; Πλάνα</a></li>
            </ul>
          </div>
          <div>
            <h5>Εταιρεία</h5>
            <ul>
              <li><a href="/about">Ποιοι Είμαστε</a></li>
              <li><a href="mailto:info@nomosio.gr">Επικοινωνία</a></li>
              <li><a href="/terms">Όροι Χρήσης</a></li>
              <li><a href="/privacy">Πολιτική Απορρήτου</a></li>
              <li><a href="/privacy#cookies">Cookies</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Nomosio.gr — Όλα τα δικαιώματα διατηρούνται.</span>
          <span>
            Το Nomosio παρέχει νομική ενημέρωση και πληροφόρηση — δεν αποτελεί
            και δεν αντικαθιστά νομική συμβουλή.
          </span>
        </div>
      </div>
    </footer>
  );
}
