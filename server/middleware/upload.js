const multer = require('multer');
const path = require('path');

/**
 * Multer disk storage configuration.
 * Routes files to uploads/temp/ for page-count requests and uploads/orders/ for order submissions.
 */
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // If the request path contains 'count-pages', store in temp directory
        if (req.originalUrl.includes('count-pages')) {
            cb(null, path.join(__dirname, '..', 'uploads', 'temp'));
        } else {
            cb(null, path.join(__dirname, '..', 'uploads', 'orders'));
        }
    },
    filename: function (req, file, cb) {
        // Sanitize the original filename: replace non-alphanumeric chars (except dots and hyphens) with underscores
        const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${sanitized}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

/**
 * Upload middleware for single file upload on field 'file'.
 */
const uploadMiddleware = upload.single('file');

module.exports = { upload, uploadMiddleware };
