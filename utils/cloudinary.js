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
        // The parameters that will be signed
        const paramsToSign = {
            timestamp: timestamp,
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default',
            folder: 'user-profiles',
            allowed_formats: 'jpg,jpeg,png',
            max_file_size: '10485760', // 10MB as string
            tags: 'user_profile'
        };
        
        // Log the parameters being signed (for debugging)
        console.log('Generating signature with params:', JSON.stringify(paramsToSign, null, 2));
        
        // Generate the signature
        const signature = cloudinary.utils.api_sign_request(
            paramsToSign, 
            process.env.CLOUDINARY_API_SECRET
        );
        
        console.log('Generated signature:', signature);
        
        return { 
            signature, 
            ...paramsToSign,
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
