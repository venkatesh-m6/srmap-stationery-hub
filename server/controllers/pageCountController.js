const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * POST /api/count-pages
 * Accepts a PDF upload, runs page_counter.py to count pages, then deletes the temp file.
 */
const countPages = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const scriptPath = path.join(__dirname, '..', 'page_counter.py');

    // Use PYTHON_BIN env var to bypass pyenv shim overhead (2x faster)
    const pythonBin = process.env.PYTHON_BIN || 'python3';
    const python = spawn(pythonBin, [scriptPath, filePath]);
    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
        output += data.toString();
    });

    python.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    python.on('close', (code) => {
        // Always clean up the temp file
        fs.unlink(filePath, (err) => {
            if (err) console.error('Failed to delete temp file:', err);
        });

        const pageCount = parseInt(output.trim(), 10);

        if (isNaN(pageCount) || pageCount <= 0) {
            console.error('Page count error:', errorOutput);
            return res.json({ pageCount: 0, error: 'Could not count pages' });
        }

        res.json({ pageCount: pageCount });
    });

    python.on('error', (err) => {
        // Clean up temp file on spawn error
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error('Failed to delete temp file:', unlinkErr);
        });

        console.error('Python spawn error:', err);
        res.json({ pageCount: 0, error: 'Python not available' });
    });
};

module.exports = { countPages };
