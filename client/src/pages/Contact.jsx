import { MapPin, Clock, Phone } from 'lucide-react';

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
                Ground Floor, University Library<br />
                SRMAP Campus, Neerukonda, AP 522502
              </p>
            </div>
            <div className="contact-info-block">
              <h3>
                <Clock size={20} />
                Opening Hours
              </h3>
              <ul>
                <li><strong>Monday - Friday:</strong> 8:00 AM - 8:00 PM</li>
                <li><strong>Saturday:</strong> 9:00 AM - 6:00 PM</li>
                <li><strong>Sunday:</strong> 10:00 AM - 4:00 PM</li>
              </ul>
            </div>
            <div className="contact-info-block">
              <h3>
                <Phone size={20} />
                Get in Touch
              </h3>
              <ul>
                <li><strong>Phone:</strong> +91 123 456 7890</li>
                <li><strong>WhatsApp:</strong> +91 123 456 7890</li>
              </ul>
            </div>
          </div>
          <div>
            <div className="map-placeholder">
              <iframe
                title="SRMAP Location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3830.873647128487!2d80.04677147493073!3d16.47440488862843!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a35f0a2a073957f%3A0xe79d66babc83e236!2sSRM%20University%20AP!5e0!3m2!1sen!2sin!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: 'var(--radius-lg)' }}
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
