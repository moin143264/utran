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
        const paramsToSign = {
            timestamp: timestamp.toString(),
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
            folder: 'user-profiles', // This will be signed
            allowed_formats: 'jpg,jpeg,png', // This will be signed
            max_file_size: '10485760', // This will be signed
            tags: 'user_profile' // This will be signed
        };

        // Create the string to sign: parameters sorted alphabetically and joined by '&'
        const stringToSign = Object.keys(paramsToSign)
            .sort()
            .map(key => `${key}=${paramsToSign[key]}`)
            .join('&');

        console.log('String to sign for Cloudinary:', stringToSign);
        
        // Create the signature using SHA1
        const signature = crypto
            .createHash('sha1')
            .update(stringToSign + process.env.CLOUDINARY_API_SECRET) // Append API secret before hashing
            .digest('hex');

        console.log('Generated Cloudinary signature:', signature);
        
        // Return the signature and all parameters that were signed, plus api_key and cloud_name
        return {
            signature,
            ...paramsToSign, // includes timestamp, upload_preset, folder, allowed_formats, max_file_size, tags
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'utran-app'
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
