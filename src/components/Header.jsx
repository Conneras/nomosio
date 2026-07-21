import Logo from "./Logo";

export default function Header() {
  return (
    <header className="site-header">
      <div className="inner">
        <Logo />
        <nav>
          <a href="/#how">Πώς λειτουργεί</a>
          <a href="/pricing">Τιμή</a>
        </nav>
        <a className="btn btn-primary" href="/dashboard">Dashboard →</a>
      </div>
    </header>
  );
}
