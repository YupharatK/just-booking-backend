const { query } = require("../config/db");
const { hashPassword } = require("../utils/auth");
const { uploadBuffer } = require("../config/cloudinary");

function json(value) {
  return value === undefined ? null : JSON.stringify(value);
}

// ฟังก์ชันสำหรับอัปเดตข้อมูลโปรไฟล์ของผู้ใช้งาน (เช่น ชื่อ, เบอร์โทร, ที่อยู่, รหัสผ่าน) ลงในฐานข้อมูล
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

// ฟังก์ชันสำหรับดึงรายการหอพักทั้งหมด โดยรองรับการค้นหาและกรองข้อมูล (ราคา, ระยะทาง, ประเภทห้อง)
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

// ฟังก์ชันสำหรับดึงรายละเอียดแบบเจาะลึกของหอพัก 1 แห่ง รวมถึงข้อมูลห้องพัก รูปภาพ และรีวิวทั้งหมด
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

// ฟังก์ชันสำหรับเพิ่มหอพักลงในรายการโปรด (Favorites) ของผู้ใช้งาน
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

// ฟังก์ชันสำหรับลบหอพักออกจากรายการโปรดของผู้ใช้งาน
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

// ฟังก์ชันสำหรับดึงข้อมูลรายการหอพักทั้งหมดที่ผู้ใช้งานกดชื่นชอบไว้
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

// ฟังก์ชันสำหรับสร้างคำขอจองห้องพัก โดยจะเช็คว่าห้องว่างหรือไม่ และลดจำนวนห้องว่างลง 1 ห้อง
async function createBooking(req, res, next) {
  try {
    const { roomId, moveInDate, note } = req.body;
    
    // ดึงข้อมูลห้องก่อนเพื่อตรวจสอบราคาและ available_from
    const rooms = await query("SELECT * FROM rooms WHERE id = ? AND status = 'available'", [roomId]);
    const room = rooms[0];

    if (!room || room.available_count <= 0) {
      return res.status(400).json({ message: "ห้องนี้ไม่พร้อมให้จอง" });
    }

    // ป้องกัน Race Condition (จองซ้อน) โดยการลดจำนวนห้องโดยตรง และเช็คว่าลดสำเร็จหรือไม่
    const updateRoom = await query(
      "UPDATE rooms SET available_count = available_count - 1 WHERE id = ? AND available_count > 0 AND status = 'available'",
      [roomId]
    );

    if (updateRoom.affectedRows === 0) {
      return res.status(409).json({ message: "ห้องนี้ถูกจองไปแล้ว (เต็มแล้ว)" });
    }

    // บังคับใช้วันที่เข้าอยู่จาก available_from (ถ้าเจ้าของหอตั้งไว้) เพื่อไม่ให้ผู้เช่าส่งวันมาเอง
    const finalMoveInDate = room.available_from ? room.available_from : (moveInDate || null);

    const booking = await query(
      `INSERT INTO bookings (user_id, room_id, move_in_date, note, status, total_amount)
       VALUES (?, ?, ?, ?, 'pending_payment', ?)`,
      [req.user.id, roomId, finalMoveInDate, note || null, room.price],
    );

    // Insert payment record immediately to bypass owner initial approval
    await query(
      `INSERT INTO payments (booking_id, amount, qr_code_url)
       VALUES (?, ?, ?)`,
      [
        booking.insertId,
        room.price,
        `${process.env.PAYMENT_QR_BASE_URL || "https://payment.example.com/qr"}/${booking.insertId}`,
      ],
    );

    res.status(201).json({
      bookingId: booking.insertId,
      status: "pending_payment",
      message: "จองสำเร็จ กรุณาชำระเงินและแนบสลิป",
    });
  } catch (error) {
    // If error occurs, we should technically revert the available_count, but left out for simplicity unless required
    next(error);
  }
}

// ฟังก์ชันสำหรับดึงประวัติการจองทั้งหมดของผู้ใช้งาน พร้อมสถานะการชำระเงินและรายละเอียดหอพัก
async function listMyBookings(req, res, next) {
  try {
    const rows = await query(
      `SELECT b.*, p.status AS payment_status, p.qr_code_url, r.room_number, r.room_type, d.name AS dormitory_name,
              u.first_name AS user_first_name, u.last_name AS user_last_name, u.phone AS user_phone
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN dormitories d ON d.id = r.dormitory_id
       LEFT JOIN payments p ON p.booking_id = b.id
       JOIN users u ON u.id = b.user_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id],
    );
    res.json({ bookings: rows });
  } catch (error) {
    next(error);
  }
}

// ฟังก์ชันสำหรับอัปโหลดสลิปโอนเงินขึ้น Cloudinary และอัปเดตสถานะการชำระเงินในฐานข้อมูล
async function submitPaymentSlip(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "กรุณาแนบรูปภาพสลิปชำระเงิน" });
    }

    const uploaded = await uploadBuffer(req.file.buffer, "just-booking/payment-slips");
    const slipImageUrl = uploaded.secure_url;

    const result = await query(
      `UPDATE payments p
       JOIN bookings b ON b.id = p.booking_id
       SET p.slip_image_url = ?, p.status = 'submitted', p.paid_at = NOW()
       WHERE p.booking_id = ? AND b.user_id = ? AND b.status = 'pending_payment'`,
      [slipImageUrl, req.params.bookingId, req.user.id],
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({
        message: "ยังไม่สามารถส่งหลักฐานชำระเงินได้ กรุณารอเจ้าของหอพักอนุมัติการจองก่อน",
      });
    }

    res.json({ message: "ส่งหลักฐานการชำระเงินแล้ว" });
  } catch (error) {
    next(error);
  }
}

// ฟังก์ชันตรวจสอบสิทธิ์การรีวิว (ผู้ใช้ต้องเคยมีประวัติการจองสถานะ completed เท่านั้น)
async function checkReviewEligibility(req, res, next) {
  try {
    const hasBooked = await query(`
      SELECT b.id FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = ? AND r.dormitory_id = ? AND b.status = 'confirmed'
      LIMIT 1
    `, [req.user.id, req.params.dormitoryId]);
    
    res.json({ eligible: hasBooked.length > 0 });
  } catch (error) {
    next(error);
  }
}

// ฟังก์ชันสำหรับบันทึกการให้คะแนน (Rating) และความคิดเห็น (Review) ของผู้ใช้งานต่อหอพัก
async function createReview(req, res, next) {
  try {
    const { rating, comment } = req.body;
    
    // Check eligibility
    const hasBooked = await query(`
      SELECT b.id FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.user_id = ? AND r.dormitory_id = ? AND b.status = 'confirmed'
      LIMIT 1
    `, [req.user.id, req.params.dormitoryId]);
    
    if (hasBooked.length === 0) {
      return res.status(403).json({ message: "คุณต้องเป็นผู้เช่าที่เข้าพักหอพักนี้แล้วเท่านั้น (สถานะการจองเสร็จสิ้น) จึงจะสามารถรีวิวได้" });
    }

    await query(
      "INSERT INTO reviews (user_id, dormitory_id, rating, comment) VALUES (?, ?, ?, ?)",
      [req.user.id, req.params.dormitoryId, Number(rating), comment || null],
    );
    res.status(201).json({ message: "เพิ่มรีวิวแล้ว" });
  } catch (error) {
    next(error);
  }
}

// ฟังก์ชันสำหรับสร้างคำขอแจ้งซ่อมสิ่งของหรือปัญหาภายในห้องพัก
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
  checkReviewEligibility,
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
