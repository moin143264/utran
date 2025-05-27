const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
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
        // Only include the parameters that should be signed
        const paramsToSign = {
            timestamp: timestamp.toString(),
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'
        };

        // Create the string to sign - must be in the format "key=value&key=value"
        const stringToSign = Object.keys(paramsToSign)
            .sort() // Sort keys alphabetically
            .map(key => `${key}=${paramsToSign[key]}`)
            .join('&');

        console.log('String to sign:', stringToSign);
        
        // Create the signature using SHA1
        const signature = crypto
            .createHash('sha1')
            .update(stringToSign + process.env.CLOUDINARY_API_SECRET)
            .digest('hex');

        console.log('Generated signature:', signature);
        
        // Return all the parameters needed for the upload
        return {
            signature,
            timestamp: paramsToSign.timestamp,
            upload_preset: paramsToSign.upload_preset,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'utran-app',
            folder: 'user-profiles',
            allowed_formats: 'jpg,jpeg,png',
            max_file_size: '10485760', // 10MB
            tags: 'user_profile'
        };
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        throw error;
    }
};

module.exports = {
    generateSignature,
    cloudinary
};
