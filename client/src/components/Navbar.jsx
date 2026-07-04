import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Don't show navbar on admin pages
  if (location.pathname.startsWith('/admin')) return null;

  const links = [
    { to: '/', label: 'Home', hash: '' },
    { to: '/services', label: 'Services' },
    { to: '/contact', label: 'Contact' },
  ];

  return (
    <header className="app-header">
      <div className="container">
        <div className="logo-group">
          <div className="logo-icon">SH</div>
          <div className="logo-text">
            <h1>SRMAP Stationery Hub</h1>
            <p>The fastest way to get documents printed.</p>
          </div>
        </div>

        <nav className="nav-links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
            end={link.to === '/'}
            onClick={() => setMobileOpen(false)}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </header>
  );
}
