const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadDataUri = async (dataUri, folder = 'dass/payment-proofs') => {
  if (!dataUri || typeof dataUri !== 'string') {
    throw new Error('Invalid image payload for upload');
  }

  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'image'
  });
};

module.exports = {
  cloudinary,
  uploadDataUri
};
