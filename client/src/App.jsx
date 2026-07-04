import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ThreeBackground from './components/ThreeBackground';
import Home from './pages/Home';
import Services from './pages/Services';
import Contact from './pages/Contact';
import AdminLogin from './pages/Admin/AdminLogin';
import Dashboard from './pages/Admin/Dashboard';

export default function App() {
  return (
    <Router>
      <ThreeBackground />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid rgba(75, 85, 99, 0.4)',
            borderRadius: '0.75rem',
          },
        }}
      />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
      </Routes>
      <Routes>
        <Route path="/" element={<Footer />} />
        <Route path="/services" element={<Footer />} />
        <Route path="/contact" element={<Footer />} />
      </Routes>
    </Router>
  );
}
