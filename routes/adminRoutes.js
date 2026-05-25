const express = require("express");
const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));
router.get("/users", adminController.listUsers);
router.patch("/users/:id/status", adminController.updateUserStatus);
router.get("/dormitories/pending", adminController.listPendingDormitories);
router.patch("/dormitories/:id/approve", adminController.approveDormitory);
router.patch("/dormitories/:id/reject", adminController.rejectDormitory);
router.get("/bookings", adminController.listBookings);
router.patch("/bookings/:bookingId/payment", adminController.verifyPayment);
router.patch("/reviews/:id/hide", adminController.hideReview);

module.exports = router;
