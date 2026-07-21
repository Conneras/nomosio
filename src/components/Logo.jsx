export default function Logo({ href = "/" }) {
  return (
    <a className="logo" href={href} aria-label="Nomosio — Αρχική">
      <span className="logo-box">
        <svg width="34" height="16" viewBox="0 0 34 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="0" width="32" height="2.6" rx="1" fill="#0d1a2e" />
          <rect x="4" y="4.6" width="4.4" height="11.4" rx="1" fill="#0d1a2e" />
          <rect x="14.8" y="4.6" width="4.4" height="11.4" rx="1" fill="#0d1a2e" />
          <rect x="25.6" y="4.6" width="4.4" height="11.4" rx="1" fill="#0d1a2e" />
        </svg>
        <span className="logo-word">Nomosio</span>
      </span>
    </a>
  );
}
