export default function Footer() {
  return (
    <footer className="app-footer">
      <p>
        © {new Date().getFullYear()}{' '}
        <a href="/">SRMAP Stationery Hub</a>. All rights reserved.
        &nbsp;|&nbsp; SRM University AP, Neerukonda, AP 522502
      </p>
    </footer>
  );
}
