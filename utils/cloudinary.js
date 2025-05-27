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
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
        folder: 'user-profiles',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        max_file_size: 10485760 // 10MB
    };
    
    // Remove any undefined values
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);
    
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    return { signature, params };
};

module.exports = {
    generateSignature,
    cloudinary
};
