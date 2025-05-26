const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'utran-app',
    api_key: '414738459261494',
    api_secret: 'bzZZeqmXUIBWWXaf0P8mwEruc1s'
});

module.exports = cloudinary;
