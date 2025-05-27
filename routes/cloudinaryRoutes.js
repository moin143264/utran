const express = require('express');
const { generateSignature } = require('../utils/cloudinary');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/cloudinary/signature
// @desc    Get signature for client-side upload
// @access  Private
router.get('/signature', protect, (req, res) => {
    try {
        // --- TEMPORARY DIAGNOSTIC SECTION START ---
        const cloudinary = require('cloudinary').v2;
        const tempCloudName = 'drh5ntram'; // CORRECTED CLOUD NAME
        const tempApiKey = '414738459261494';
        const tempApiSecret = 'bzZZeqmXUIBWWXaf0P8mwEruc1s';
        const tempUploadPreset = 'ml_default'; // from user's .env

        // Configure Cloudinary directly and temporarily
        cloudinary.config({
            cloud_name: tempCloudName,
            api_key: tempApiKey,
            api_secret: tempApiSecret,
            secure: true
        });
        console.log('[DIAGNOSTIC] Using temporarily hardcoded Cloudinary config in /signature route.');

        const timestamp = Math.round(new Date().getTime() / 1000).toString();
        
        const paramsToSign = {
            timestamp: timestamp,
            upload_preset: tempUploadPreset,
        };

        console.log('[DIAGNOSTIC] Parameters being signed (minimal, in-route):', paramsToSign);

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            tempApiSecret
        );

        console.log('[DIAGNOSTIC] Generated signature (minimal, in-route):', signature);

        const signatureData = {
            signature,
            timestamp: paramsToSign.timestamp,
            upload_preset: paramsToSign.upload_preset,
            api_key: tempApiKey,
            cloud_name: tempCloudName,
            folder: 'user-profiles', 
            allowed_formats: 'jpg,jpeg,png',
            max_file_size: '10485760',
            tags: 'user_profile'
        };
        // --- TEMPORARY DIAGNOSTIC SECTION END ---
        
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
