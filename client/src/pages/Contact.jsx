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
                src="https://www.google.com/maps/place/SR+BLOCK+SRMAP/@16.4627665,80.5056251,18.14z/data=!4m14!1m7!3m6!1s0x3a35f3000d452a99:0xb22251dd1a6a3a51!2sSR+BLOCK+SRMAP!8m2!3d16.4627307!4d80.5068995!16s%2Fg%2F11lnwtkllw!3m5!1s0x3a35f3000d452a99:0xb22251dd1a6a3a51!8m2!3d16.4627307!4d80.5068995!16s%2Fg%2F11lnwtkllw?entry=ttu&g_ep=EgoyMDI2MDcyNy4wIKXMDSoASAFQAw%3D%3D"
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
