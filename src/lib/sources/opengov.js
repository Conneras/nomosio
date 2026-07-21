// opengov.gr — δημόσιες διαβουλεύσεις σχεδίων νόμων
// Επιβεβαιωμένο με πραγματικό τεστ στις 21/07/2026:
//   GET https://www.opengov.gr/home/feed → 301 → https://archive.opengov.gr/home/feed
//   → RSS 2.0 (lastBuildDate: 13/07/2026, ενεργό)

const OPENGOV_FEED = "https://archive.opengov.gr/home/feed";

export async function fetchOpengovFeed() {
  const res = await fetch(OPENGOV_FEED, {
    headers: { "User-Agent": "Mozilla/5.0 (Nomosio feed reader)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`opengov feed HTTP ${res.status}`);
  const xml = await res.text();
  return parseRssItems(xml);
}

// Ελαφρύς RSS parser χωρίς εξαρτήσεις (τα items του opengov είναι απλά title/link/pubDate/description)
function parseRssItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    items.push({
      title: tag(block, "title"),
      link: tag(block, "link"),
      pubDate: tag(block, "pubDate"),
      description: tag(block, "description"),
    });
  }
  return items;
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}
