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
        const signature = generateSignature(timestamp);
        res.json({
            timestamp,
            signature
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
