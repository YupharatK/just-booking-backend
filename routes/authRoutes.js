const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", upload.single("profileImage"), authController.register);
router.post("/login", authController.login);
router.get("/me", requireAuth, authController.me);

module.exports = router;
