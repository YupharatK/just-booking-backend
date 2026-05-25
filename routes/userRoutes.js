const express = require("express");
const userController = require("../controllers/userController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const router = express.Router();
const memberOnly = [requireAuth, requireRole("member", "admin")];

router.get("/dormitories", userController.listDormitories);
router.get("/dormitories/:id", userController.getDormitory);
router.patch("/profile", requireAuth, userController.updateProfile);
router.get("/favorites", memberOnly, userController.listFavorites);
router.post("/favorites/:dormitoryId", memberOnly, userController.addFavorite);
router.delete("/favorites/:dormitoryId", memberOnly, userController.removeFavorite);
router.post("/bookings", memberOnly, userController.createBooking);
router.get("/bookings", memberOnly, userController.listMyBookings);
router.post("/bookings/:bookingId/payment-slip", memberOnly, userController.submitPaymentSlip);
router.post("/dormitories/:dormitoryId/reviews", memberOnly, userController.createReview);
router.post("/maintenance-requests", memberOnly, userController.createMaintenanceRequest);

module.exports = router;
