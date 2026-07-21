import Logo from "@/components/Logo";

export const metadata = { title: "Dashboard — Nomosio" };

// Προσωρινή σελίδα — το dashboard (εγγραφή, ενημέρωση, Nomosio AI, έξυπνες
// κινήσεις, ειδοποιήσεις, ρυθμίσεις) χτίζεται στην επόμενη φάση.
export default function Dashboard() {
  return (
    <div className="page-light" style={{ display: "flex", flexDirection: "column" }}>
      <div className="subpage-topbar">
        <Logo />
        <a className="back" href="/">← Αρχική</a>
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 460 }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Το dashboard έρχεται.</h1>
          <p style={{ color: "var(--ink-600)", lineHeight: 1.65 }}>
            Η νέα έκδοση του Nomosio χτίζεται αυτή τη στιγμή. Η εγγραφή και η
            καθημερινή ενημέρωση θα ανοίξουν σύντομα.
          </p>
        </div>
      </div>
    </div>
  );
}
