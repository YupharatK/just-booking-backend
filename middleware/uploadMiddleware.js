const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_IMAGE_SIZE_MB || 5) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("อัปโหลดได้เฉพาะไฟล์รูปภาพ"));
    }

    cb(null, true);
  },
});

module.exports = upload;
