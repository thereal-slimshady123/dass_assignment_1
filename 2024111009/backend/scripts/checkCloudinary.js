require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

(async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('CLOUDINARY_OK', result.status || 'ok');
  } catch (error) {
    console.error('CLOUDINARY_FAIL', error.message);
    process.exit(1);
  }
})();
