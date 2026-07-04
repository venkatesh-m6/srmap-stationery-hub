import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign, Archive, FileText, LogOut, Menu, Wallet, Loader,
} from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import ChartDataLabelsPlugin from 'chartjs-plugin-datalabels';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import {
  fetchOrders, fetchStats, fetchChartData as fetchChartDataApi,
  updateOrderStatus as updateOrderStatusApi, fetchPrices, updatePrices,
  logout,
} from '../../services/api';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  Title, Tooltip, Legend, ChartDataLabelsPlugin
);

const PAGES = {
  queue: { label: 'Live Queue', icon: LayoutDashboard },
  pricing: { label: 'Price Settings', icon: DollarSign },
  'all-orders': { label: 'All Orders', icon: Archive },
  reports: { label: 'Export Reports', icon: FileText },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('queue');

  // Queue state
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, pendingOrders: 0 });
  const [chartData, setChartData] = useState({ labels: [], data: [] });
  const [chartRange, setChartRange] = useState('month-by-week');
  const [chartTitle, setChartTitle] = useState('This Month by Week');

  // Price state
  const [prices, setPrices] = useState({});
  const [priceStatus, setPriceStatus] = useState('');

  const wsRef = useRef(null);

  // Fetch orders
  const loadOrders = useCallback(async () => {
    try {
      const res = await fetchOrders();
      setOrders(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/admin');
      }
    }
  }, [navigate]);

  // Fetch stats
  const loadStats = useCallback(async () => {
    try {
      const res = await fetchStats();
      setStats(res.data);
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  }, []);

  // Fetch chart data
  const loadChartData = useCallback(async (range) => {
    try {
      const res = await fetchChartDataApi(range);
      setChartData(res.data);
      setChartRange(range);
      if (range === 'month-by-week') setChartTitle('This Month by Week');
      else if (range === 'year-by-month') setChartTitle('This Year by Month');
      else setChartTitle('Revenue by Year');
    } catch (e) {
      console.error('Error loading chart:', e);
    }
  }, []);

  // Load prices
  const loadPrices = useCallback(async () => {
    try {
      const res = await fetchPrices();
      setPrices(res.data);
    } catch (e) {
      console.error('Error loading prices:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadOrders();
    loadStats();
    loadChartData('month-by-week');
  }, [loadOrders, loadStats, loadChartData]);

  // WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => console.log('Admin WebSocket connected.');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_order') {
        setOrders((prev) => [data.payload, ...prev]);
        loadStats();
        loadChartData(chartRange);
        toast.success(`New order: ${data.payload.tokenId}`);
      } else if (data.type === 'status_update') {
        loadStats();
      }
    };
    ws.onclose = () => {
      console.log('WebSocket disconnected.');
    };

    return () => ws.close();
  }, [loadStats, loadChartData, chartRange]);

  // Page switch
  const handlePageSwitch = (pageId) => {
    setActivePage(pageId);
    if (pageId === 'queue') {
      loadOrders();
      loadStats();
      loadChartData('month-by-week');
    } else if (pageId === 'pricing') {
      loadPrices();
    }
  };

  // Update order status
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await updateOrderStatusApi(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId || o._id === orderId ? res.data : o))
      );
      loadStats();
      toast.success('Order status updated!');
    } catch {
      toast.error('Failed to update order status.');
    }
  };

  // Save prices
  const handlePriceSave = async (e) => {
    e.preventDefault();
    try {
      await updatePrices({ ...prices, singleSided: 0 });
      setPriceStatus('success');
      toast.success('Prices updated successfully!');
      setTimeout(() => setPriceStatus(''), 3000);
    } catch {
      setPriceStatus('error');
      toast.error('Failed to save prices.');
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    navigate('/admin');
  };

  // Group orders by status
  const newOrders = orders.filter((o) => o.status === 'new');
  const processingOrders = orders.filter((o) => o.status === 'processing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className={`admin-sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="logo-group" style={{ marginBottom: '0.5rem' }}>
          <div className="logo-icon" style={{ width: 38, height: 38, fontSize: '0.95rem' }}>SH</div>
          <div className="logo-text">
            <h1 style={{ fontSize: '1.05rem' }}>Admin Panel</h1>
          </div>
        </div>
        <div className="sidebar-nav">
          {Object.entries(PAGES).map(([id, { label, icon: Icon }]) => (
            <button
              key={id}
              className={`sidebar-link ${activePage === id ? 'active' : ''}`}
              onClick={() => handlePageSwitch(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <button className="sidebar-link logout" onClick={handleLogout}>
          <LogOut size={18} style={{ color: 'var(--color-danger)' }} />
          <span>Logout</span>
        </button>
      </nav>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-header">
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={22} />
          </button>
          <h1>{PAGES[activePage]?.label || 'Dashboard'}</h1>
        </header>

        <main className="admin-content">
          {/* QUEUE PAGE */}
          {activePage === 'queue' && (
            <div>
              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <Wallet size={36} style={{ color: 'var(--color-success)' }} className="stat-icon" />
                  <div>
                    <p className="stat-label">Total Revenue (Today)</p>
                    <p className="stat-value">₹{(stats.totalRevenue || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <Archive size={36} style={{ color: 'var(--color-info)' }} className="stat-icon" />
                  <div>
                    <p className="stat-label">Total Orders (Today)</p>
                    <p className="stat-value">{stats.totalOrders || 0}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <Loader size={36} style={{ color: 'var(--color-warning)' }} className="stat-icon" />
                  <div>
                    <p className="stat-label">Pending Orders</p>
                    <p className="stat-value">{stats.pendingOrders || 0}</p>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="chart-container">
                <div className="chart-header">
                  <h3>{chartTitle}</h3>
                  <div className="chart-filters">
                    {[
                      { range: 'month-by-week', label: 'Weekly' },
                      { range: 'year-by-month', label: 'Monthly' },
                      { range: 'all-years', label: 'Yearly' },
                    ].map(({ range, label }) => (
                      <button
                        key={range}
                        className={`chart-filter-btn ${chartRange === range ? 'active' : ''}`}
                        onClick={() => loadChartData(range)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-canvas-wrapper">
                  <Line
                    data={{
                      labels: chartData.labels || [],
                      datasets: [
                        {
                          label: 'Revenue',
                          data: chartData.data || [],
                          borderColor: '#818CF8',
                          backgroundColor: 'rgba(99, 102, 241, 0.1)',
                          tension: 0.3,
                          fill: true,
                          pointBackgroundColor: '#818CF8',
                          pointBorderColor: '#fff',
                          pointHoverRadius: 6,
                          pointRadius: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: '#9CA3AF', callback: (v) => `₹${v}` },
                          grid: { color: '#374151' },
                        },
                        x: {
                          ticks: { color: '#9CA3AF' },
                          grid: { display: false },
                        },
                      },
                      plugins: {
                        legend: { display: false },
                        datalabels: {
                          anchor: 'end',
                          align: 'end',
                          color: '#fff',
                          font: { weight: 'bold', size: 11 },
                          formatter: (v) => (v > 0 ? `₹${v}` : ''),
                        },
                        tooltip: {
                          backgroundColor: '#1F2937',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          callbacks: { label: (ctx) => `Revenue: ₹${ctx.raw}` },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              {/* Kanban Board */}
              <div className="kanban-board">
                <KanbanColumn
                  title="New Orders"
                  dotColor="#60a5fa"
                  orders={newOrders}
                  actionLabel="Start Processing"
                  actionStatus="processing"
                  onAction={handleStatusUpdate}
                />
                <KanbanColumn
                  title="In Progress"
                  dotColor="#fbbf24"
                  orders={processingOrders}
                  actionLabel="Ready for Pickup"
                  actionStatus="ready"
                  onAction={handleStatusUpdate}
                />
                <KanbanColumn
                  title="Ready for Pickup"
                  dotColor="#34d399"
                  orders={readyOrders}
                  onAction={handleStatusUpdate}
                />
              </div>
            </div>
          )}

          {/* PRICING PAGE */}
          {activePage === 'pricing' && (
            <div className="page-section" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Manage Prices</h2>
              <form className="price-form" onSubmit={handlePriceSave}>
                {[
                  { key: 'bw', label: 'B/W Print (per page)', step: '0.5' },
                  { key: 'color', label: 'Color Print (per page)', step: '0.5' },
                  { key: 'firstPageColor', label: 'First Page Color (extra charge)', step: '0.5' },
                  { key: 'doubleSided', label: 'Double Sided (discount per page)', step: '0.1' },
                  { key: 'spiral', label: 'Spiral Binding (flat rate)', step: '1' },
                  { key: 'photo_4x6', label: '4x6 Photo Print', step: '1' },
                  { key: 'passport', label: 'Passport Photos (8-pack)', step: '1' },
                  { key: 'rush', label: 'Rush Order Fee', step: '1' },
                ].map(({ key, label, step }) => (
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input
                      type="number"
                      className="form-input"
                      step={step}
                      value={prices[key] ?? ''}
                      onChange={(e) => setPrices((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
                <button type="submit" className="btn btn-primary">Save Prices</button>
                {priceStatus === 'success' && (
                  <p className="text-success mt-2">Prices updated successfully!</p>
                )}
                {priceStatus === 'error' && (
                  <p className="text-danger mt-2">Error saving prices.</p>
                )}
              </form>
            </div>
          )}

          {/* ALL ORDERS PAGE */}
          {activePage === 'all-orders' && (
            <div className="page-section" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem' }}>All Orders</h2>
              {orders.length === 0 ? (
                <p className="text-muted">No orders yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <th style={thStyle}>Token</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Details</th>
                        <th style={thStyle}>Phone</th>
                        <th style={thStyle}>Price</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id || order._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={tdStyle}>
                            <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                              {order.tokenId}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            {new Date(order.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td style={tdStyle}>{order.details}</td>
                          <td style={tdStyle}>{order.phone}</td>
                          <td style={{ ...tdStyle, color: 'var(--color-success)', fontWeight: 600 }}>
                            ₹{(order.price || 0).toFixed(2)}
                          </td>
                          <td style={tdStyle}>
                            <span style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: order.status === 'new' ? 'rgba(96,165,250,0.15)' :
                                order.status === 'processing' ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)',
                              color: order.status === 'new' ? '#60a5fa' :
                                order.status === 'processing' ? '#fbbf24' : '#34d399',
                            }}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* REPORTS PAGE */}
          {activePage === 'reports' && (
            <div className="page-section" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
              <h2 className="section-title" style={{ fontSize: '1.5rem' }}>Export Reports</h2>
              <p className="text-muted mb-4">Download order data as CSV for your records.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const csv = [
                    'Token,Date,Details,Phone,Price,Status',
                    ...orders.map((o) =>
                      `${o.tokenId},"${new Date(o.timestamp).toLocaleString()}","${o.details}",${o.phone},${o.price},${o.status}`
                    ),
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `orders-report-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Report downloaded!');
                }}
              >
                <FileText size={18} /> Export to CSV
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({ title, dotColor, orders, actionLabel, actionStatus, onAction }) {
  return (
    <div className="kanban-column">
      <h2>
        <span className="dot" style={{ background: dotColor }} />
        {title}
      </h2>
      <div className="column-body">
        {orders.length === 0 && (
          <p className="text-muted text-sm" style={{ padding: '1rem', textAlign: 'center' }}>
            No orders
          </p>
        )}
        {orders.map((order) => {
          const orderId = order.id || order._id;
          const time = new Date(order.timestamp).toLocaleString('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          });
          const whatsappMsg = encodeURIComponent(
            `Hi! Your SRMAP Stationery order (${order.tokenId}) is ready for pickup.`
          );

          return (
            <div className="order-card" key={orderId}>
              <div className="order-card-header">
                <div>
                  <p className="time">{time}</p>
                  <p className="token">{order.tokenId}</p>
                </div>
                <p className="price">₹{(order.price || 0).toFixed(2)}</p>
              </div>
              <p className="details">{order.details}</p>
              {order.phone && (
                <a
                  href={`https://wa.me/${order.phone}?text=${whatsappMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-link"
                >
                  📱 {order.phone}
                </a>
              )}
              {order.filePath && (
                <a
                  href={`/${order.filePath}`}
                  download={order.fileName || 'download'}
                  className="btn btn-ghost btn-sm btn-full"
                  style={{ marginBottom: '0.5rem', marginTop: '0.25rem' }}
                >
                  Download File
                </a>
              )}
              <div className="actions">
                {actionLabel && actionStatus && (
                  <button
                    className={`btn btn-sm btn-full ${
                      actionStatus === 'processing' ? 'btn-success' : 'btn-warning'
                    }`}
                    onClick={() => onAction(orderId, actionStatus)}
                  >
                    {actionLabel}
                  </button>
                )}
                {order.status === 'ready' && (
                  <span className="completed-text" style={{ flex: 1 }}>
                    Completed.<br />(Notified Student)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '0.65rem 1rem',
  color: 'var(--color-text-secondary)',
};
