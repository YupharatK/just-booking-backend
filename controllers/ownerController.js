const { query } = require("../config/db");
const { uploadBuffer } = require("../config/cloudinary");

function json(value) {
  return value === undefined ? null : JSON.stringify(value);
}

async function createDormitory(req, res, next) {
  try {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      distanceFromUniversityKm,
      facilities,
      securityFeatures,
      rentalTerms,
      rules,
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: "กรุณากรอกชื่อและที่อยู่หอพัก" });
    }

    const result = await query(
      `INSERT INTO dormitories
        (owner_id, name, description, address, latitude, longitude, distance_from_university_km,
         facilities, security_features, rental_terms, rules, cover_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        name,
        description || null,
        address,
        latitude || null,
        longitude || null,
        distanceFromUniversityKm || null,
        json(facilities),
        json(securityFeatures),
        rentalTerms || null,
        rules || null,
        null,
      ],
    );

    res.status(201).json({ id: result.insertId, message: "ส่งข้อมูลหอพักเพื่อรออนุมัติแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function uploadDormitoryCover(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "กรุณาเลือกรูปหน้าปกหอพัก" });
    }

    const dormitories = await query("SELECT id FROM dormitories WHERE id = ? AND owner_id = ?", [
      req.params.id,
      req.user.id,
    ]);

    if (!dormitories[0]) {
      return res.status(404).json({ message: "ไม่พบหอพักของคุณ" });
    }

    const uploaded = await uploadBuffer(req.file.buffer, "just-booking/dormitory-covers");

    await query(
      `UPDATE dormitories
       SET cover_image_url = ?, cover_image_public_id = ?
       WHERE id = ? AND owner_id = ?`,
      [uploaded.secure_url, uploaded.public_id, req.params.id, req.user.id],
    );

    res.json({
      message: "อัปโหลดรูปหน้าปกหอพักแล้ว",
      image: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function listMyDormitories(req, res, next) {
  try {
    const rows = await query(
      "SELECT * FROM dormitories WHERE owner_id = ? ORDER BY created_at DESC",
      [req.user.id],
    );
    res.json({ dormitories: rows });
  } catch (error) {
    next(error);
  }
}

async function updateDormitory(req, res, next) {
  try {
    const {
      name,
      description,
      address,
      latitude,
      longitude,
      distanceFromUniversityKm,
      facilities,
      securityFeatures,
      rentalTerms,
      rules,
    } = req.body;

    await query(
      `UPDATE dormitories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        distance_from_university_km = COALESCE(?, distance_from_university_km),
        facilities = COALESCE(?, facilities),
        security_features = COALESCE(?, security_features),
        rental_terms = COALESCE(?, rental_terms),
        rules = COALESCE(?, rules),
        status = IF(status = 'rejected', 'pending', status)
       WHERE id = ? AND owner_id = ?`,
      [
        name || null,
        description || null,
        address || null,
        latitude || null,
        longitude || null,
        distanceFromUniversityKm || null,
        facilities === undefined ? null : json(facilities),
        securityFeatures === undefined ? null : json(securityFeatures),
        rentalTerms || null,
        rules || null,
        req.params.id,
        req.user.id,
      ],
    );

    res.json({ message: "อัปเดตข้อมูลหอพักแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function deleteDormitory(req, res, next) {
  try {
    await query("DELETE FROM dormitories WHERE id = ? AND owner_id = ?", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ message: "ลบข้อมูลหอพักแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function createRoom(req, res, next) {
  try {
    const {
      roomNumber,
      roomType,
      price,
      availableCount = 1,
      status = "available",
      availableFrom,
      facilities,
    } = req.body;

    const allowed = await query("SELECT id FROM dormitories WHERE id = ? AND owner_id = ?", [
      req.params.dormitoryId,
      req.user.id,
    ]);

    if (!allowed[0]) {
      return res.status(404).json({ message: "ไม่พบหอพักของคุณ" });
    }

    const result = await query(
      `INSERT INTO rooms
        (dormitory_id, room_number, room_type, price, available_count, status, available_from, facilities)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.dormitoryId,
        roomNumber || null,
        roomType,
        Number(price),
        Number(availableCount),
        status,
        availableFrom || null,
        json(facilities),
      ],
    );

    res.status(201).json({ id: result.insertId, message: "เพิ่มห้องพักแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function uploadRoomImages(req, res, next) {
  try {
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ message: "กรุณาเลือกรูปห้องตัวอย่าง" });
    }

    const rooms = await query(
      `SELECT r.id
       FROM rooms r
       JOIN dormitories d ON d.id = r.dormitory_id
       WHERE r.id = ? AND d.owner_id = ?`,
      [req.params.roomId, req.user.id],
    );

    if (!rooms[0]) {
      return res.status(404).json({ message: "ไม่พบห้องพักของคุณ" });
    }

    const existingImages = await query("SELECT COUNT(*) AS total FROM room_images WHERE room_id = ?", [
      req.params.roomId,
    ]);
    const existingTotal = Number(existingImages[0].total || 0);

    if (existingTotal + files.length > 5) {
      return res.status(400).json({ message: "รูปห้องตัวอย่างเพิ่มได้สูงสุด 5 รูป" });
    }

    const images = [];
    for (const file of files) {
      const uploaded = await uploadBuffer(file.buffer, "just-booking/room-samples");
      const sortOrder = existingTotal + images.length + 1;

      const result = await query(
        `INSERT INTO room_images (room_id, image_url, cloudinary_public_id, sort_order)
         VALUES (?, ?, ?, ?)`,
        [req.params.roomId, uploaded.secure_url, uploaded.public_id, sortOrder],
      );

      images.push({
        id: result.insertId,
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        sortOrder,
      });

      if (existingTotal === 0 && images.length === 1) {
        await query("UPDATE rooms SET image_url = ?, image_public_id = ? WHERE id = ?", [
          uploaded.secure_url,
          uploaded.public_id,
          req.params.roomId,
        ]);
      }
    }

    res.status(201).json({ message: "อัปโหลดรูปห้องตัวอย่างแล้ว", images });
  } catch (error) {
    next(error);
  }
}

async function updateRoom(req, res, next) {
  try {
    const { roomNumber, roomType, price, availableCount, status, availableFrom, facilities } = req.body;

    await query(
      `UPDATE rooms r
       JOIN dormitories d ON d.id = r.dormitory_id
       SET r.room_number = COALESCE(?, r.room_number),
        r.room_type = COALESCE(?, r.room_type),
        r.price = COALESCE(?, r.price),
        r.available_count = COALESCE(?, r.available_count),
        r.status = COALESCE(?, r.status),
        r.available_from = COALESCE(?, r.available_from),
        r.facilities = COALESCE(?, r.facilities)
       WHERE r.id = ? AND d.owner_id = ?`,
      [
        roomNumber || null,
        roomType || null,
        price || null,
        availableCount ?? null,
        status || null,
        availableFrom || null,
        facilities === undefined ? null : json(facilities),
        req.params.roomId,
        req.user.id,
      ],
    );

    res.json({ message: "อัปเดตห้องพักแล้ว" });
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
       WHERE d.owner_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id],
    );
    res.json({ bookings: rows });
  } catch (error) {
    next(error);
  }
}

async function approveBooking(req, res, next) {
  try {
    const bookings = await query(
      `SELECT b.id, b.total_amount
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN dormitories d ON d.id = r.dormitory_id
       WHERE b.id = ? AND d.owner_id = ? AND b.status = 'pending_owner_approval'`,
      [req.params.bookingId, req.user.id],
    );

    if (!bookings[0]) {
      return res.status(404).json({ message: "ไม่พบรายการจองที่รออนุมัติ" });
    }

    await query("UPDATE bookings SET status = 'pending_payment' WHERE id = ?", [
      req.params.bookingId,
    ]);

    await query(
      `INSERT INTO payments (booking_id, amount, qr_code_url)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), qr_code_url = VALUES(qr_code_url)`,
      [
        req.params.bookingId,
        bookings[0].total_amount,
        `${process.env.PAYMENT_QR_BASE_URL || "https://payment.example.com/qr"}/${req.params.bookingId}`,
      ],
    );

    res.json({ message: "อนุมัติการจองแล้ว ผู้เช่าสามารถชำระเงินได้" });
  } catch (error) {
    next(error);
  }
}

async function rejectBooking(req, res, next) {
  try {
    const bookings = await query(
      `SELECT b.id, b.room_id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN dormitories d ON d.id = r.dormitory_id
       WHERE b.id = ? AND d.owner_id = ? AND b.status = 'pending_owner_approval'`,
      [req.params.bookingId, req.user.id],
    );

    if (!bookings[0]) {
      return res.status(404).json({ message: "ไม่พบรายการจองที่รออนุมัติ" });
    }

    await query("UPDATE bookings SET status = 'rejected' WHERE id = ?", [req.params.bookingId]);
    await query("UPDATE rooms SET available_count = available_count + 1 WHERE id = ?", [
      bookings[0].room_id,
    ]);

    res.json({ message: "ปฏิเสธการจองแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function updateBookingPayment(req, res, next) {
  try {
    const { status } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ message: "สถานะการชำระเงินไม่ถูกต้อง" });
    }

    const bookings = await query(
      `SELECT b.id
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       JOIN dormitories d ON d.id = r.dormitory_id
       JOIN payments p ON p.booking_id = b.id
       WHERE b.id = ?
        AND d.owner_id = ?
        AND b.status = 'pending_payment'
        AND p.status = 'submitted'`,
      [req.params.bookingId, req.user.id],
    );

    if (!bookings[0]) {
      return res.status(404).json({ message: "ไม่พบรายการชำระเงินที่รอการยืนยัน" });
    }

    await query("UPDATE payments SET status = ? WHERE booking_id = ?", [
      status,
      req.params.bookingId,
    ]);

    if (status === "verified") {
      await query("UPDATE bookings SET status = 'confirmed' WHERE id = ?", [
        req.params.bookingId,
      ]);
    }

    res.json({ message: "อัปเดตการชำระเงินแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function replyReview(req, res, next) {
  try {
    await query(
      `UPDATE reviews rv
       JOIN dormitories d ON d.id = rv.dormitory_id
       SET rv.owner_reply = ?
       WHERE rv.id = ? AND d.owner_id = ?`,
      [req.body.reply, req.params.reviewId, req.user.id],
    );
    res.json({ message: "ตอบรีวิวแล้ว" });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDormitory,
  createRoom,
  deleteDormitory,
  approveBooking,
  listBookings,
  listMyDormitories,
  rejectBooking,
  replyReview,
  updateDormitory,
  updateBookingPayment,
  updateRoom,
  uploadDormitoryCover,
  uploadRoomImages,
};
