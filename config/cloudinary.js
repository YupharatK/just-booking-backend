const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function assertCloudinaryConfig() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    const error = new Error("กรุณาตั้งค่า Cloudinary ในไฟล์ .env");
    error.status = 500;
    throw error;
  }
}

function uploadBuffer(buffer, folder) {
  assertCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

function uploadSecureBuffer(buffer, folder, resourceType = 'auto') {
  assertCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        type: 'authenticated',
        access_mode: 'authenticated',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
}

function getSignedUrl(publicId, resourceType = 'auto') {
  if (!publicId) return null;
  // Generate a URL that is valid for 1 hour (3600 seconds)
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'authenticated',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600
  });
}

module.exports = {
  uploadBuffer,
  uploadSecureBuffer,
  getSignedUrl,
  cloudinary
};
