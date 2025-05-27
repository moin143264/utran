const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'utran-app',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Generate signature for client-side upload
const generateSignature = (timestamp) => {
    try {
        // Aligning with Cloudinary's error: only sign timestamp and upload_preset
        const paramsToSign = {
            timestamp: timestamp.toString(), // Must be a string
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
            // Temporarily removing other parameters from signing, based on Cloudinary error
            // folder: 'user-profiles',
            // allowed_formats: 'jpg,jpeg,png',
            // max_file_size: '10485760',
            // tags: 'user_profile'
        };

        console.log('Parameters being sent to Cloudinary SDK for signing (minimal):', paramsToSign);

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        console.log('Generated Cloudinary signature (minimal, via SDK):', signature);

        // Return only the signed params, signature, api_key, and cloud_name.
        // The frontend will also need to be adjusted to only send these signed params.
        return {
            signature,
            timestamp: paramsToSign.timestamp,
            upload_preset: paramsToSign.upload_preset,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'utran-app',
            // Other parameters (folder, tags, etc.) will be sent by frontend but NOT signed
            // This means they might be ignored by Cloudinary or might need to be configured
            // in the upload preset if they are desired.
            folder: 'user-profiles', // Still send to frontend, for it to include in FormData (unsigned)
            allowed_formats: 'jpg,jpeg,png', // Still send to frontend (unsigned)
            max_file_size: '10485760', // Still send to frontend (unsigned)
            tags: 'user_profile' // Still send to frontend (unsigned)
        };
    } catch (error) {
        console.error('Error generating Cloudinary signature (minimal):', error);
        throw error;
    }
};

module.exports = { generateSignature, cloudinary };
