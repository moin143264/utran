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
    // The parameters that will be signed
    const paramsToSign = {
        timestamp: timestamp,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
        folder: 'user-profiles',
        allowed_formats: ['jpg', 'jpeg', 'png'].join(','),
        max_file_size: 10485760 // 10MB
    };
    
    // Remove any undefined values
    Object.keys(paramsToSign).forEach(key => {
        if (paramsToSign[key] === undefined || paramsToSign[key] === '') {
            delete paramsToSign[key];
        }
    });
    
    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(
        paramsToSign, 
        process.env.CLOUDINARY_API_SECRET
    );
    
    return { 
        signature, 
        timestamp,
        ...paramsToSign,
        api_key: process.env.CLOUDINARY_API_KEY,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'utran-app'
    };
};

module.exports = {
    generateSignature,
    cloudinary
};
