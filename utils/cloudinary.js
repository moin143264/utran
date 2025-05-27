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
    const params = {
        timestamp: timestamp,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default'
    };
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    return signature;
};

module.exports = {
    generateSignature,
    cloudinary
};
