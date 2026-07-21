// Εθνικό Τυπογραφείο (ΦΕΚ) — search.et.gr
// Επιβεβαιωμένο με πραγματικό τεστ στις 21/07/2026:
//   POST https://searchetv99.azurewebsites.net/api/simplesearch
//   body: {"selectYear":["2026"],"selectIssue":["01"],"documentNumber":"","searchText":"","datePublished":"","dateReleased":""}
//   → {"status":"ok","data":"[{search_ID, search_DocumentNumber, search_IssueGroupID, search_IssueDate, search_PublicationDate, search_Pages, search_PrimaryLabel, search_Score}]"}
// Σελίδα ΦΕΚ:  https://search.et.gr/fek/?fekId=<search_ID>
// PDF:         https://ia37rg02wpsa01.blob.core.windows.net/fek/<issueGroup 2ψηφια>/<έτος>/<έτος><issueGroup 2ψηφια><αριθμός 5ψηφια>.pdf
//   π.χ. Β 4249/2026 → /fek/02/2026/20260204249.pdf

const ET_API = "https://searchetv99.azurewebsites.net/api/simplesearch";

// issueGroupId: "01" = Τεύχος Α (νόμοι, ΠΔ), "02" = Τεύχος Β (υπουργικές αποφάσεις)
export async function searchFek({ year = "", issue = "", searchText = "", documentNumber = "" } = {}) {
  const res = await fetch(ET_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://search.et.gr" },
    body: JSON.stringify({
      selectYear: year ? [String(year)] : [],
      selectIssue: issue ? [String(issue)] : [],
      documentNumber: String(documentNumber || ""),
      searchText: String(searchText || ""),
      datePublished: "",
      dateReleased: "",
    }),
  });
  if (!res.ok) throw new Error(`ET API HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "ok") throw new Error(`ET API status: ${json.status}`);
  const rows = JSON.parse(json.data);
  return rows.map((r) => ({
    id: r.search_ID,
    label: r.search_PrimaryLabel, // π.χ. "Α 118/2026"
    documentNumber: r.search_DocumentNumber,
    issueGroupId: r.search_IssueGroupID,
    issueDate: r.search_IssueDate,
    publicationDate: r.search_PublicationDate,
    pages: r.search_Pages,
    pageUrl: `https://search.et.gr/fek/?fekId=${r.search_ID}`,
    pdfUrl: fekPdfUrl(r),
  }));
}

function fekPdfUrl(r) {
  const year = (r.search_IssueDate || "").split("/")[2]?.slice(0, 4);
  const ig = String(r.search_IssueGroupID).padStart(2, "0");
  const num = String(r.search_DocumentNumber).padStart(5, "0");
  if (!year) return null;
  return `https://ia37rg02wpsa01.blob.core.windows.net/fek/${ig}/${year}/${year}${ig}${num}.pdf`;
}
