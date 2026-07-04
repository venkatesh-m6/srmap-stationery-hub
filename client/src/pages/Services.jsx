import { FileText, Palette, BookOpen, Layers, Image, ScanLine } from 'lucide-react';

const services = [
  {
    icon: FileText,
    title: 'B/W Xerox',
    desc: 'Fast black and white copies for documents up to A3 size.',
  },
  {
    icon: Palette,
    title: 'Color Xerox',
    desc: 'Vivid copies up to A3. Popular for presentations.',
  },
  {
    icon: BookOpen,
    title: 'Spiral & Hard Binding',
    desc: 'Professional binding for reports, projects, and presentations.',
  },
  {
    icon: Layers,
    title: 'Lamination',
    desc: 'Protect documents with gloss or matte lamination.',
  },
  {
    icon: Image,
    title: 'Photo Prints',
    desc: 'High-quality photo printing in various glossy and matte sizes.',
  },
  {
    icon: ScanLine,
    title: 'Scanning',
    desc: 'Digital copies of your documents with email or USB delivery.',
  },
];

export default function Services() {
  return (
    <div className="page-container">
      <div className="page-section">
        <h2 className="section-title">Our Services</h2>
        <div className="services-grid">
          {services.map((svc, i) => (
            <div
              className="service-card"
              key={svc.title}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <svc.icon className="service-icon" size={36} />
              <h3>{svc.title}</h3>
              <p>{svc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
