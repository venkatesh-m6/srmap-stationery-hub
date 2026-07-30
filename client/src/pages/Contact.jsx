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
                title="SRMAP Location"
                src="https://maps.app.goo.gl/tEyx1ejYu3PTrjZy6"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: "var(--radius-lg)" }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
