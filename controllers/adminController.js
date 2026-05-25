const { query } = require("../config/db");

async function listUsers(req, res, next) {
  try {
    const rows = await query(
      `SELECT id, email, role, first_name, last_name, nickname, phone, address, profile_image_url, status, created_at
       FROM users ORDER BY created_at DESC`,
    );
    res.json({ users: rows });
  } catch (error) {
    next(error);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    await query("UPDATE users SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
    res.json({ message: "อัปเดตสถานะผู้ใช้แล้ว" });
  } catch (error) {
    next(error);
  }
}

async function listPendingDormitories(req, res, next) {
  try {
    const rows = await query(
      `SELECT d.*, u.first_name, u.last_name, u.email, u.phone
       FROM dormitories d
       JOIN users u ON u.id = d.owner_id
       WHERE d.status = 'pending'
       ORDER BY d.created_at ASC`,
    );
    res.json({ dormitories: rows });
  } catch (error) {
    next(error);
  }
}

async function countDormitories(req, res, next) {
  try {
    const rows = await query(
      `SELECT
        COUNT(*) AS total,
        SUM(status = 'pending') AS pending,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected,
        SUM(status = 'inactive') AS inactive
       FROM dormitories`,
    );

    const counts = rows[0] || {};
    res.json({
      total: Number(counts.total || 0),
      byStatus: {
        pending: Number(counts.pending || 0),
        approved: Number(counts.approved || 0),
        rejected: Number(counts.rejected || 0),
        inactive: Number(counts.inactive || 0),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function approveDormitory(req, res, next) {
  try {
    await query(
      "UPDATE dormitories SET status = 'approved', rejection_reason = NULL WHERE id = ?",
      [req.params.id],
    );
    res.json({ message: "อนุมัติหอพักแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function rejectDormitory(req, res, next) {
  try {
    await query(
      "UPDATE dormitories SET status = 'rejected', rejection_reason = ? WHERE id = ?",
      [req.body.reason || null, req.params.id],
    );
    res.json({ message: "ปฏิเสธหอพักแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const rows = await query(
      `SELECT b.*, p.status AS payment_status, p.slip_image_url, u.first_name, u.last_name,
        r.room_number, r.room_type, d.name AS dormitory_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN rooms r ON r.id = b.room_id
       JOIN dormitories d ON d.id = r.dormitory_id
       LEFT JOIN payments p ON p.booking_id = b.id
       ORDER BY b.created_at DESC`,
    );
    res.json({ bookings: rows });
  } catch (error) {
    next(error);
  }
}

async function verifyPayment(req, res, next) {
  try {
    const { status = "verified" } = req.body;
    await query("UPDATE payments SET status = ? WHERE booking_id = ?", [
      status,
      req.params.bookingId,
    ]);

    if (status === "verified") {
      await query("UPDATE bookings SET status = 'paid' WHERE id = ?", [req.params.bookingId]);
    }

    res.json({ message: "อัปเดตการชำระเงินแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function hideReview(req, res, next) {
  try {
    await query("UPDATE reviews SET status = 'hidden' WHERE id = ?", [req.params.id]);
    res.json({ message: "ซ่อนรีวิวแล้ว" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveDormitory,
  countDormitories,
  hideReview,
  listBookings,
  listPendingDormitories,
  listUsers,
  rejectDormitory,
  updateUserStatus,
  verifyPayment,
};
