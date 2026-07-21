// Διαύγεια — diavgeia.gov.gr (εγκύκλιοι & αποφάσεις δημοσίου)
// Επιβεβαιωμένο με πραγματικό τεστ στις 21/07/2026:
//   GET https://diavgeia.gov.gr/opendata/search?q=&page=0&size=1  (χωρίς κλειδί)
//   → {"decisions":[{protocolNumber, subject, issueDate, organizationId, decisionTypeId, ...}]}
// Τεκμηρίωση: https://diavgeia.gov.gr/api/help

const DIAVGEIA_API = "https://diavgeia.gov.gr/opendata";

// type: π.χ. "ΕΓΚΥΚΛΙΟΣ" μέσω παραμέτρου type. Αναζήτηση: q (λέξεις), from_date/to_date (YYYY-MM-DD)
export async function searchDiavgeia({ q = "", type = "", fromDate = "", toDate = "", page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  if (fromDate) params.set("from_issue_date", fromDate);
  if (toDate) params.set("to_issue_date", toDate);
  const res = await fetch(`${DIAVGEIA_API}/search?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Diavgeia API HTTP ${res.status}`);
  const json = await res.json();
  return (json.decisions || []).map((d) => ({
    ada: d.ada,
    subject: d.subject,
    protocolNumber: d.protocolNumber,
    issueDate: d.issueDate, // epoch ms
    organizationId: d.organizationId,
    decisionTypeId: d.decisionTypeId,
    url: d.documentUrl || (d.ada ? `https://diavgeia.gov.gr/decision/view/${d.ada}` : null),
  }));
}
