import { useState, useCallback } from 'react';
import { UploadCloud, Settings2, Ticket, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { countPages, createOrder, verifyPayment } from '../services/api';

const RUSH_FEE = 20;
const PRICES = {
  bw: 2, color: 10, firstPageColor: 8,
  singleSided: 0, doubleSided: -0.5,
  spiral: 30, photo_4x6: 15, passport: 50,
};

function calculateClientPrice(options) {
  let copyPrice = 0;
  const copies = parseInt(options.copies, 10) || 1;

  if (options.service) {
    copyPrice = PRICES[options.service] || 0;
  } else {
    const pages = parseInt(options.pages, 10) || 1;
    const pageCost = (PRICES[options.printType] || 0) + (PRICES[options.layout] || 0);
    copyPrice = pages * pageCost;
    if (options.firstPageColor && options.printType === 'bw' && pages >= 1) {
      copyPrice += PRICES.firstPageColor;
    }
    if (options.binding === 'spiral') copyPrice += PRICES.spiral;
  }
  if (options.rush) copyPrice += RUSH_FEE;
  return Math.max(0, copyPrice) * copies;
}

export default function Home() {
  const [currentFile, setCurrentFile] = useState(null);
  const [fileType, setFileType] = useState(null); // 'document' | 'image'
  const [pageCount, setPageCount] = useState(1);
  const [pagesLocked, setPagesLocked] = useState(false);
  const [pageCountStatus, setPageCountStatus] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Order options
  const [options, setOptions] = useState({
    pages: 1,
    copies: 1,
    printType: 'bw',
    layout: 'singleSided',
    binding: 'none',
    firstPageColor: false,
    service: null,
    rush: false,
    phone: '',
  });

  // Token modal
  const [tokenModal, setTokenModal] = useState({ show: false, tokenId: '' });

  const resetUploader = useCallback(() => {
    setCurrentFile(null);
    setFileType(null);
    setShowOrderForm(false);
    setPageCountStatus('');
    setOptions({
      pages: 1, copies: 1, printType: 'bw', layout: 'singleSided',
      binding: 'none', firstPageColor: false, service: null, rush: false, phone: '',
    });
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error('File is too large (Max 30MB).');
      return;
    }

    setCurrentFile(file);
    const isImage = ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type);

    if (file.type === 'application/pdf') {
      setPageCountStatus('Analyzing PDF, please wait...');
      try {
        const res = await countPages(file);
        const count = res.data.pageCount > 0 ? res.data.pageCount : 1;
        setPageCount(count);
        setPagesLocked(true);
        setPageCountStatus(`✓ ${count} page(s) detected.`);
        setOptions((prev) => ({ ...prev, pages: count }));
        setFileType('document');
        setShowOrderForm(true);
      } catch {
        setPageCountStatus('Could not count pages. Please enter manually.');
        setPagesLocked(false);
        setFileType('document');
        setShowOrderForm(true);
      }
    } else if (isImage) {
      setPageCountStatus('✓ Image file selected.');
      setFileType('image');
      setOptions((prev) => ({ ...prev, service: 'photo_4x6' }));
      setShowOrderForm(true);
    } else {
      toast.error('Invalid file type. Please upload a PDF, JPEG, JPG, or PNG.');
    }
  };

  const updateOption = (key, value) => {
    setOptions((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === 'printType' && value === 'color') {
        updated.firstPageColor = false;
      }
      return updated;
    });
  };

  const totalPrice = calculateClientPrice(options);
  const phoneValid = /^\d{10}$/.test(options.phone.trim());

  const processPayment = async () => {
    if (!currentFile) return;
    setProcessing(true);

    try {
      const orderRes = await createOrder(currentFile, options);
      const orderData = orderRes.data;

      if (orderData.keyId === 'dummy_key') {
        // Dummy mode
        const verifyRes = await verifyPayment({
          razorpay_order_id: orderData.orderId,
        });
        if (verifyRes.data.status === 'success') {
          setTokenModal({ show: true, tokenId: verifyRes.data.tokenId });
        } else {
          toast.error('Dummy payment verification failed.');
        }
        return;
      }

      // Real Razorpay payment
      const razorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'SRMAP Stationery Hub',
        description: 'Print & Photo Services',
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const verifyRes = await verifyPayment(response);
            if (verifyRes.data.status === 'success') {
              setTokenModal({ show: true, tokenId: verifyRes.data.tokenId });
            } else {
              toast.error('Payment verification failed. Please contact the shop.');
            }
          } catch {
            toast.error('Payment verification error.');
          }
        },
        prefill: { contact: options.phone.trim() },
        theme: { color: '#4F46E5' },
      };

      const rzp = new window.Razorpay(razorpayOptions);
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
      });
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.error || 'An error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-container">
      {/* Hero */}
      <div className="hero-section page-section">
        <h2>Skip the Rush. Print Online.</h2>
        <p className="subtitle">
          Upload your file, choose your options, and pick it up when it&apos;s ready.
        </p>

        {/* How It Works */}
        <div className="how-it-works">
          <div className="step-card">
            <div className="step-header">
              <UploadCloud className="step-icon" size={28} />
              <span className="step-title">1. Upload File</span>
            </div>
            <p className="step-desc">Select your PDF, JPG, or PNG file from your device.</p>
          </div>
          <div className="step-card">
            <div className="step-header">
              <Settings2 className="step-icon" size={28} />
              <span className="step-title">2. Customize & Pay</span>
            </div>
            <p className="step-desc">Choose your print options and pay securely online.</p>
          </div>
          <div className="step-card">
            <div className="step-header">
              <Ticket className="step-icon" size={28} />
              <span className="step-title">3. Get Token</span>
            </div>
            <p className="step-desc">Receive a unique token (e.g., B-101) for your order.</p>
          </div>
        </div>

        {/* File Upload Area */}
        <div style={{ maxWidth: 640, margin: '2rem auto 0' }}>
          {!currentFile ? (
            <>
              <div
                className={`upload-zone ${dragOver ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect({ target: { files: [file] } });
                }}
              >
                <UploadCloud className="upload-icon" size={48} />
                <p className="upload-text">
                  Drag & Drop your file here<br />
                  or <span>click to browse</span>
                </p>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                />
              </div>
              <p className="file-accept-text">Accepted files: PDF, JPG, PNG. Max size: 30MB.</p>
            </>
          ) : (
            <div className="uploaded-file">
              <div className="file-info">
                <p className="font-medium" style={{ color: 'white', fontSize: '0.85rem' }}>
                  Selected File:
                </p>
                <p className="file-name">{currentFile.name}</p>
                <p className="file-status">{pageCountStatus}</p>
              </div>
              <button className="file-remove" onClick={resetUploader} title="Remove file">
                <X size={22} />
              </button>
            </div>
          )}
        </div>

        {/* Order Form */}
        {showOrderForm && (
          <div className="order-section">
            {/* Options Card */}
            <div className="order-card">
              {fileType === 'document' ? (
                <>
                  <h3>Customize Your Document</h3>
                  <div className="form-group">
                    <label className="form-label">Number of Pages</label>
                    <input
                      type="number"
                      className="form-input"
                      value={options.pages}
                      min={1}
                      readOnly={pagesLocked}
                      onChange={(e) => updateOption('pages', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Print Type</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="printType"
                          value="bw"
                          checked={options.printType === 'bw'}
                          onChange={(e) => updateOption('printType', e.target.value)}
                        />
                        B&W
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="printType"
                          value="color"
                          checked={options.printType === 'color'}
                          onChange={(e) => updateOption('printType', e.target.value)}
                        />
                        Color
                      </label>
                    </div>
                  </div>
                  {options.printType === 'bw' && (
                    <div className="form-group" style={{ paddingLeft: '1.25rem' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={options.firstPageColor}
                          onChange={(e) => updateOption('firstPageColor', e.target.checked)}
                        />
                        Print first page in color
                      </label>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Layout</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="layout"
                          value="singleSided"
                          checked={options.layout === 'singleSided'}
                          onChange={(e) => updateOption('layout', e.target.value)}
                        />
                        Single-Sided
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="layout"
                          value="doubleSided"
                          checked={options.layout === 'doubleSided'}
                          onChange={(e) => updateOption('layout', e.target.value)}
                        />
                        Double-Sided
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Binding</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="binding"
                          value="none"
                          checked={options.binding === 'none'}
                          onChange={(e) => updateOption('binding', e.target.value)}
                        />
                        None
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="binding"
                          value="spiral"
                          checked={options.binding === 'spiral'}
                          onChange={(e) => updateOption('binding', e.target.value)}
                        />
                        Spiral Binding
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Copies</label>
                    <input
                      type="number"
                      className="form-input"
                      value={options.copies}
                      min={1}
                      onChange={(e) => updateOption('copies', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h3>Choose Photo Service</h3>
                  <div className="form-group">
                    <label className="form-label">Service Type</label>
                    <select
                      className="form-select"
                      value={options.service || 'photo_4x6'}
                      onChange={(e) => updateOption('service', e.target.value)}
                    >
                      <option value="photo_4x6">Standard 4x6 Print</option>
                      <option value="passport">Passport Photos (8-pack)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Summary Card */}
            <div className="order-card">
              <h3>Order Summary</h3>
              <div style={{ minHeight: 60 }}>
                {fileType === 'document' ? (
                  <>
                    <div className="summary-row">
                      <span>Pages</span><span>{options.pages}</span>
                    </div>
                    <div className="summary-row">
                      <span>Copies</span><span>{options.copies}</span>
                    </div>
                    <div className="summary-row">
                      <span>Print</span>
                      <span>
                        {options.firstPageColor
                          ? 'B&W (First Page Color)'
                          : options.printType.toUpperCase()}
                      </span>
                    </div>
                    <div className="summary-row">
                      <span>Layout</span>
                      <span>{options.layout === 'singleSided' ? 'Single-Sided' : 'Double-Sided'}</span>
                    </div>
                    {options.binding === 'spiral' && (
                      <div className="summary-row">
                        <span>Binding</span><span>Spiral</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="summary-row">
                    <span>Service</span>
                    <span>{options.service === 'passport' ? 'Passport Photos' : '4x6 Print'}</span>
                  </div>
                )}
                {options.rush && (
                  <div className="summary-row rush-highlight">
                    <span>Rush Order</span><span>+₹{RUSH_FEE}</span>
                  </div>
                )}
              </div>

              <div className="summary-total">
                <span className="label">Total Price:</span>
                <span className="amount">₹{totalPrice.toFixed(2)}</span>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={options.rush}
                    onChange={(e) => updateOption('rush', e.target.checked)}
                  />
                  <span>
                    Rush Order (Pickup in 15 mins) –{' '}
                    <strong>Add ₹{RUSH_FEE}</strong>
                  </span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label" style={{ color: 'white' }}>
                  Your WhatsApp Number
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g., 9123456789"
                  value={options.phone}
                  onChange={(e) => updateOption('phone', e.target.value)}
                />
                <p className="text-xs text-muted mt-1">
                  We&apos;ll send your token ID and pickup notification here.
                </p>
              </div>

              <button
                className="btn btn-primary btn-full btn-lg"
                style={{ marginTop: '1.25rem' }}
                disabled={!phoneValid || processing}
                onClick={processPayment}
              >
                {processing ? 'Processing...' : 'Proceed to Pay'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Token Success Modal */}
      {tokenModal.show && (
        <div className="modal-overlay" onClick={() => {
          setTokenModal({ show: false, tokenId: '' });
          resetUploader();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3>Payment Successful!</h3>
            <p>Your order has been placed. Please show this token ID at the counter to collect your documents.</p>
            <div className="token-display">
              <p className="token-label">Your Token ID is:</p>
              <p className="token-id">{tokenModal.tokenId}</p>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              A confirmation has also been sent to your WhatsApp.
            </p>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: '1.25rem' }}
              onClick={() => {
                setTokenModal({ show: false, tokenId: '' });
                resetUploader();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
