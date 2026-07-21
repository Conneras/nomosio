import "./globals.css";

export const metadata = {
  title: "Nomosio — Οι νόμοι, σε απλά ελληνικά",
  description:
    "Το Nomosio παρακολουθεί κάθε νέο νομοσχέδιο και νόμο — και σου λέει τι σημαίνει για σένα, τι προθεσμίες έχεις και ποιες νόμιμες κινήσεις σε συμφέρουν.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
