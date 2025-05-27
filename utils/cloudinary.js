const cloudinary = require('cloudinary').v2;

// Configure cloudinary
cloudinary.config({
    cloud_name: 'utran-app',
    api_key: '414738459261494',
    api_secret: 'bzZZeqmXUIBWWXaf0P8mwEruc1s'
});

// Generate signature for client-side upload
const generateSignature = (timestamp) => {
    const str = `timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = cloudinary.utils.api_sign_request({ timestamp }, process.env.CLOUDINARY_API_SECRET);
    return signature;
};

module.exports = {
    generateSignature,
    cloudinary
};
