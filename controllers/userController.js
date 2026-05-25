const { query } = require("../config/db");
const { hashPassword } = require("../utils/auth");

function json(value) {
  return value === undefined ? null : JSON.stringify(value);
}

async function updateProfile(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      nickname,
      phone,
      address,
      profileImageUrl,
      password,
    } = req.body;

    await query(
      `UPDATE users SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        nickname = COALESCE(?, nickname),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        profile_image_url = COALESCE(?, profile_image_url),
        password_hash = COALESCE(?, password_hash)
       WHERE id = ?`,
      [
        firstName || null,
        lastName || null,
        nickname || null,
        phone || null,
        address || null,
        profileImageUrl || null,
        password ? hashPassword(password) : null,
        req.user.id,
      ],
    );

    const users = await query(
      `SELECT id, email, role, first_name, last_name, nickname, phone, address, profile_image_url, status
       FROM users WHERE id = ?`,
      [req.user.id],
    );

    res.json({ user: users[0] });
  } catch (error) {
    next(error);
  }
}

async function listDormitories(req, res, next) {
  try {
    const { search, minPrice, maxPrice, maxDistance, roomType } = req.query;
    const conditions = ["d.status = 'approved'"];
    const params = [];

    if (search) {
      conditions.push("(d.name LIKE ? OR d.address LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (maxDistance) {
      conditions.push("d.distance_from_university_km <= ?");
      params.push(Number(maxDistance));
    }
    if (minPrice) {
      conditions.push("r.price >= ?");
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      conditions.push("r.price <= ?");
      params.push(Number(maxPrice));
    }
    if (roomType) {
      conditions.push("r.room_type = ?");
      params.push(roomType);
    }

    const rows = await query(
      `SELECT d.*, MIN(r.price) AS min_price, MAX(r.price) AS max_price,
        AVG(rv.rating) AS average_rating, COUNT(DISTINCT rv.id) AS review_count
       FROM dormitories d
       LEFT JOIN rooms r ON r.dormitory_id = d.id
       LEFT JOIN reviews rv ON rv.dormitory_id = d.id AND rv.status = 'visible'
       WHERE ${conditions.join(" AND ")}
       GROUP BY d.id
       ORDER BY d.updated_at DESC`,
      params,
    );

    res.json({ dormitories: rows });
  } catch (error) {
    next(error);
  }
}

async function getDormitory(req, res, next) {
  try {
    const dormitories = await query(
      `SELECT d.*, AVG(rv.rating) AS average_rating, COUNT(rv.id) AS review_count
       FROM dormitories d
       LEFT JOIN reviews rv ON rv.dormitory_id = d.id AND rv.status = 'visible'
       WHERE d.id = ? AND d.status = 'approved'
       GROUP BY d.id`,
      [req.params.id],
    );

    if (!dormitories[0]) {
      return res.status(404).json({ message: "ไม่พบข้อมูลหอพัก" });
    }

    const [rooms, reviews] = await Promise.all([
      query("SELECT * FROM rooms WHERE dormitory_id = ? ORDER BY price ASC", [req.params.id]),
      query(
        `SELECT rv.*, u.nickname, u.first_name, u.last_name
         FROM reviews rv
         JOIN users u ON u.id = rv.user_id
         WHERE rv.dormitory_id = ? AND rv.status = 'visible'
         ORDER BY rv.created_at DESC`,
        [req.params.id],
      ),
    ]);

    const roomsWithImages = await Promise.all(
      rooms.map(async (room) => {
        const images = await query(
          "SELECT * FROM room_images WHERE room_id = ? ORDER BY sort_order ASC, id ASC",
          [room.id],
        );
        return { ...room, images };
      }),
    );

    res.json({ dormitory: dormitories[0], rooms: roomsWithImages, reviews });
  } catch (error) {
    next(error);
  }
}

async function addFavorite(req, res, next) {
  try {
    await query(
      "INSERT IGNORE INTO favorites (user_id, dormitory_id) VALUES (?, ?)",
      [req.user.id, req.params.dormitoryId],
    );
    res.status(201).json({ message: "บันทึกรายการโปรดแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function removeFavorite(req, res, next) {
  try {
    await query("DELETE FROM favorites WHERE user_id = ? AND dormitory_id = ?", [
      req.user.id,
      req.params.dormitoryId,
    ]);
    res.json({ message: "ลบรายการโปรดแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function listFavorites(req, res, next) {
  try {
    const rows = await query(
      `SELECT d.*
       FROM favorites f
       JOIN dormitories d ON d.id = f.dormitory_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.id],
    );
    res.json({ favorites: rows });
  } catch (error) {
    next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const { roomId, moveInDate, note } = req.body;
    const rooms = await query("SELECT * FROM rooms WHERE id = ? AND status = 'available'", [roomId]);

    if (!rooms[0] || rooms[0].available_count <= 0) {
      return res.status(400).json({ message: "ห้องนี้ไม่พร้อมให้จอง" });
    }

    const booking = await query(
      `INSERT INTO bookings (user_id, room_id, move_in_date, note, total_amount)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, roomId, moveInDate || null, note || null, rooms[0].price],
    );

    await query(
      `INSERT INTO payments (booking_id, amount, qr_code_url)
       VALUES (?, ?, ?)`,
      [
        booking.insertId,
        rooms[0].price,
        `${process.env.PAYMENT_QR_BASE_URL || "https://payment.example.com/qr"}/${booking.insertId}`,
      ],
    );

    await query(
      "UPDATE rooms SET available_count = GREATEST(available_count - 1, 0) WHERE id = ?",
      [roomId],
    );

    res.status(201).json({ bookingId: booking.insertId, message: "สร้างรายการจองแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function listMyBookings(req, res, next) {
  try {
    const rows = await query(
      `SELECT b.*, p.status AS payment_status, p.qr_code_url, r.room_number, r.room_type, d.name AS dormitory_name
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN dormitories d ON d.id = r.dormitory_id
       LEFT JOIN payments p ON p.booking_id = b.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id],
    );
    res.json({ bookings: rows });
  } catch (error) {
    next(error);
  }
}

async function submitPaymentSlip(req, res, next) {
  try {
    const { slipImageUrl } = req.body;
    await query(
      `UPDATE payments p
       JOIN bookings b ON b.id = p.booking_id
       SET p.slip_image_url = ?, p.status = 'submitted', p.paid_at = NOW()
       WHERE p.booking_id = ? AND b.user_id = ?`,
      [slipImageUrl, req.params.bookingId, req.user.id],
    );

    res.json({ message: "ส่งหลักฐานการชำระเงินแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function createReview(req, res, next) {
  try {
    const { rating, comment } = req.body;
    await query(
      "INSERT INTO reviews (user_id, dormitory_id, rating, comment) VALUES (?, ?, ?, ?)",
      [req.user.id, req.params.dormitoryId, Number(rating), comment || null],
    );
    res.status(201).json({ message: "เพิ่มรีวิวแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function createMaintenanceRequest(req, res, next) {
  try {
    const { roomId, title, description } = req.body;
    const result = await query(
      "INSERT INTO maintenance_requests (user_id, room_id, title, description) VALUES (?, ?, ?, ?)",
      [req.user.id, roomId, title, description || null],
    );
    res.status(201).json({ id: result.insertId, message: "แจ้งซ่อมเรียบร้อย" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addFavorite,
  createBooking,
  createMaintenanceRequest,
  createReview,
  getDormitory,
  listDormitories,
  listFavorites,
  listMyBookings,
  removeFavorite,
  submitPaymentSlip,
  updateProfile,
};
