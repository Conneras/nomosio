/*
 * Νομόσιο build: wraps the artifact-format source (index.html) into a full
 * standalone page for web deployment (public/index.html).
 * The same source file is also published as-is as a Claude Artifact.
 */
const fs = require('fs');
const path = require('path');

let src = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

// The source's leading <title> and viewport meta move into the real <head>.
src = src.replace(/^<title>[\s\S]*?<\/title>\s*/, '');
src = src.replace(/<meta name="viewport"[^>]*>\s*/, '');

const head = `<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Νομόσιο — Η Ζυγαριά του Νόμου</title>
<meta name="description" content="Υπηρετεί ο νόμος τους πολίτες — ή τους κυβερνώντες; Η ζυγαριά του Νομόσιου ζυγίζει μόνο τεκμηριωμένα στοιχεία, με ανοιχτή μεθοδολογία και πηγές για όλα.">
<meta property="og:title" content="Νομόσιο — Η Ζυγαριά του Νόμου">
<meta property="og:description" content="Δείκτες, σκάνδαλα, νόμοι, δημόσιο χρήμα και το Συνέδριο των Αρχαίων — όλα με πηγές. Η ζυγαριά δεν έχει άποψη· ζυγίζει τεκμήρια.">
<meta property="og:type" content="website">
<meta property="og:locale" content="el_GR">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%E2%9A%96%EF%B8%8F%3C/text%3E%3C/svg%3E">
</head>
<body>
`;

const out = head + src + '\n</body>\n</html>\n';
fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), out);
console.log('built public/index.html (' + out.length + ' bytes)');
