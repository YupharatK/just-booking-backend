const express = require("express");
const ownerController = require("../controllers/ownerController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(requireAuth, requireRole("owner", "admin"));
router.get("/dormitories", ownerController.listMyDormitories);
router.post("/dormitories", ownerController.createDormitory);
router.patch("/dormitories/:id", ownerController.updateDormitory);
router.post(
  "/dormitories/:id/cover-image",
  upload.single("coverImage"),
  ownerController.uploadDormitoryCover,
);
router.delete("/dormitories/:id", ownerController.deleteDormitory);
router.post("/dormitories/:dormitoryId/rooms", ownerController.createRoom);
router.patch("/rooms/:roomId", ownerController.updateRoom);
router.post("/rooms/:roomId/images", upload.array("roomImages", 5), ownerController.uploadRoomImages);
router.get("/bookings", ownerController.listBookings);
router.patch("/bookings/:bookingId/approve", ownerController.approveBooking);
router.patch("/bookings/:bookingId/reject", ownerController.rejectBooking);
router.post("/reviews/:reviewId/reply", ownerController.replyReview);

module.exports = router;
