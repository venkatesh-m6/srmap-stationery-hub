const fs = require('fs');

/**
 * POST /api/count-pages
 * Counts pages in an uploaded PDF using pure Node.js — zero extra dependencies.
 * Works on Render, Vercel, Railway, and any Node.js host without Python.
 *
 * Strategy 1: Read /Count N from PDF xref/trailer (fastest, most accurate)
 * Strategy 2: Count /Type /Page occurrences in the raw binary
 * Strategy 3: Return 1 as safe fallback
 */
const countPages = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const buffer = fs.readFileSync(filePath);
        // Use latin1 so each byte maps 1:1 to a character — safe for binary PDF data
        const content = buffer.toString('latin1');

        let pageCount = 0;

        // Strategy 1: Find /Count N in the PDF (this is the definitive page count value)
        // PDFs store total page count as "/Count <number>" in the Pages dictionary
        const countMatches = content.match(/\/Count\s+(\d+)/g);
        if (countMatches && countMatches.length > 0) {
            // The largest /Count value is the total pages (nested page trees may have smaller counts)
            const counts = countMatches.map(m => parseInt(m.replace(/\/Count\s+/, ''), 10));
            pageCount = Math.max(...counts);
        }

        // Strategy 2: Count /Type /Page entries (each is one page object)
        if (pageCount <= 0) {
            const pageMatches = content.match(/\/Type\s*\/Page[^s]/g);
            pageCount = pageMatches ? pageMatches.length : 0;
        }

        // Strategy 3: Safe fallback
        if (pageCount <= 0) pageCount = 1;

        res.json({ pageCount });

    } catch (err) {
        console.error('Page count error:', err.message);
        res.json({ pageCount: 1, warning: 'Could not count pages automatically' });
    } finally {
        // Always clean up temp file
        fs.unlink(filePath, (e) => {
            if (e) console.error('Temp cleanup failed:', e.message);
        });
    }
};

module.exports = { countPages };
