const express = require('express');
const {
    generateCompetitionReport,
    generateTeamPDF,
    downloadPDF
} = require('../controllers/pdfController');
const { protect, authorize } = require('../middleware/authMiddleware');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Generate competition report PDF
router.get(
    '/competition/:id/:type',
    protect,
    authorize('organizer', 'admin'),
    generateCompetitionReport
);

// Generate team statistics PDF
router.get(
    '/team/:id',
    protect,
    generateTeamPDF
);

// Secure download endpoint
router.get('/download/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const fileData = global.pdfFiles?.get(token);

        if (!fileData) {
            return res.status(404).json({ message: 'PDF not found or has expired' });
        }

        const { filePath, filename, expiryTime, organizerId } = fileData;

        // Check if file has expired
        if (Date.now() > expiryTime) {
            try {
                await fs.unlink(filePath);
                global.pdfFiles.delete(token);
            } catch (error) {
                console.error('Error deleting expired file:', error);
            }
            return res.status(410).json({ message: 'PDF has expired' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && req.user.id !== organizerId.toString()) {
            return res.status(403).json({ message: 'Not authorized to download this PDF' });
        }

        // Send file
        res.download(filePath, filename, async (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error downloading file' });
            }
            
            // Delete file and metadata after successful download
            try {
                await fs.unlink(filePath);
                global.pdfFiles.delete(token);
            } catch (error) {
                console.error('Error cleaning up after download:', error);
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
