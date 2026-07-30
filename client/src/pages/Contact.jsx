import { MapPin, Clock, Phone } from "lucide-react";

export default function Contact() {
  return (
    <div className="page-container">
      <div className="page-section">
        <h2 className="section-title">Contact & Location</h2>
        <div className="contact-grid">
          <div>
            <div className="contact-info-block">
              <h3>
                <MapPin size={20} />
                Address
              </h3>
              <p>
                SR Block, Ground Floor, University Library
                <br />
                SRMAP Campus, Neerukonda, AP 522502
              </p>
            </div>
            <div className="contact-info-block">
              <h3>
                <Clock size={20} />
                Opening Hours
              </h3>
              <ul>
                <li>
                  <strong>Monday - Friday:</strong> 8:00 AM - 8:00 PM
                </li>
                <li>
                  <strong>Saturday:</strong> 9:00 AM - 6:00 PM
                </li>
                <li>
                  <strong>Sunday:</strong> 10:00 AM - 4:00 PM
                </li>
              </ul>
            </div>
            <div className="contact-info-block">
              <h3>
                <Phone size={20} />
                Get in Touch
              </h3>
              <ul>
                <li>
                  <strong>Phone:</strong> +91 871 210 0933
                </li>
                <li>
                  <strong>WhatsApp:</strong> +91 871 210 0933
                </li>
              </ul>
            </div>
          </div>
          <div>
            <div className="map-placeholder">
              <iframe
                title="SR Block, SRMAP Campus Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3825.6!2d80.5043246!3d16.4627307!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a35f3000d452a99%3A0xb22251dd1a6a3a51!2sSR%20BLOCK%20SRMAP!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: "var(--radius-lg)" }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {/* Open in Google Maps button */}
            <a
              href="https://maps.app.goo.gl/tEyx1ejYu3PTrjZy6"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                marginTop: '0.75rem', fontSize: '0.82rem', color: '#818cf8',
                textDecoration: 'none', fontWeight: 500,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
