const express = require('express');
const { generateSignature } = require('../utils/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/cloudinary/signature
// @desc    Get signature for client-side upload
// @access  Private
router.get('/signature', protect, (req, res) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const signatureData = generateSignature(timestamp); // Restored call
        
        res.json(signatureData);
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        res.status(500).json({ 
            message: 'Failed to generate upload signature',
            error: error.message 
        });
    }
});

module.exports = router;
