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

const uploadDocs = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'ownerIdCard') {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("รูปบัตรประชาชนต้องเป็นไฟล์รูปภาพเท่านั้น"));
      }
    } else if (file.fieldname === 'dormDocument') {
      if (file.mimetype !== "application/pdf" && !file.originalname.toLowerCase().endsWith(".pdf")) {
        return cb(new Error("เอกสารหอพักต้องเป็นไฟล์ PDF เท่านั้น"));
      }
    } else {
      // For any other unexpected fields
      return cb(new Error("อัปโหลดไฟล์ไม่ถูกต้อง"));
    }
    cb(null, true);
  },
});

module.exports = {
  upload,
  uploadDocs
};
