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
        const { signature, params } = generateSignature(timestamp);
        
        res.json({
            timestamp,
            signature,
            ...params, // Include all the signed parameters
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'utran-app',
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
            folder: 'user-profiles',
            allowed_formats: ['jpg', 'jpeg', 'png'],
            max_file_size: 10485760 // 10MB
        });
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        res.status(500).json({ 
            message: 'Failed to generate upload signature',
            error: error.message 
        });
    }
});

module.exports = router;
