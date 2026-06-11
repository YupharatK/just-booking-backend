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

    const updates = [];
    const values = [];

    if (roomNumber !== undefined) { updates.push('r.room_number = ?'); values.push(roomNumber || null); }
    if (roomType !== undefined) { updates.push('r.room_type = ?'); values.push(roomType || null); }
    if (price !== undefined) { updates.push('r.price = ?'); values.push(price || null); }
    if (availableCount !== undefined) { updates.push('r.available_count = ?'); values.push(availableCount); }
    if (status !== undefined) { updates.push('r.status = ?'); values.push(status || null); }
    if (availableFrom !== undefined) { updates.push('r.available_from = ?'); values.push(availableFrom || null); }
    if (facilities !== undefined) { updates.push('r.facilities = ?'); values.push(facilities === null ? null : json(facilities)); }

    if (updates.length > 0) {
      await query(
        `UPDATE rooms r
         JOIN dormitories d ON d.id = r.dormitory_id
         SET ${updates.join(', ')}
         WHERE r.id = ? AND d.owner_id = ?`,
        [...values, req.params.roomId, req.user.id],
      );
    }

    res.json({ message: "อัปเดตห้องพักแล้ว" });
  } catch (error) {
    next(error);
  }
}

async function listBookings(req, res, next) {
  try {
    const rows = await query(
      `SELECT b.*, p.status AS payment_status, p.slip_image_url, u.first_name, u.last_name, u.phone, u.email, u.profile_image_url, u.nickname, u.address,
        r.room_number, r.room_type, d.name AS dormitory_name,
        (SELECT AVG(rating) FROM tenant_reviews WHERE tenant_id = u.id) AS average_rating,
        (SELECT COUNT(*) FROM tenant_reviews WHERE tenant_id = u.id) AS review_count
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
    const { status, move_in_date } = req.body;

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
        AND p.status != 'verified'`,
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
      if (move_in_date) {
        await query("UPDATE bookings SET status = 'confirmed', move_in_date = ? WHERE id = ?", [
          move_in_date,
          req.params.bookingId,
        ]);
      } else {
        await query("UPDATE bookings SET status = 'confirmed' WHERE id = ?", [
          req.params.bookingId,
        ]);
      }
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

async function reviewTenant(req, res, next) {
  try {
    const { rating, comment, dormitoryId } = req.body;
    
    // Check if the tenant actually completed a booking at a dorm owned by this owner
    const hasCompletedBooking = await query(`
      SELECT b.id FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN dormitories d ON r.dormitory_id = d.id
      WHERE b.user_id = ? AND d.owner_id = ? AND d.id = ? AND b.status = 'confirmed'
      LIMIT 1
    `, [req.params.tenantId, req.user.id, dormitoryId]);
    
    if (hasCompletedBooking.length === 0) {
      return res.status(403).json({ message: "คุณสามารถรีวิวได้เฉพาะผู้เช่าที่เข้าพักหอพักของคุณเท่านั้น (สถานะการจองต้องเป็น completed)" });
    }

    await query(
      "INSERT INTO tenant_reviews (owner_id, tenant_id, dormitory_id, rating, comment) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)",
      [req.user.id, req.params.tenantId, dormitoryId, Number(rating), comment || null],
    );
    res.status(201).json({ message: "รีวิวผู้เช่าสำเร็จ" });
  } catch (error) {
    next(error);
  }
}

async function getTenantReviews(req, res, next) {
  try {
    const reviews = await query(`
      SELECT tr.*, u.first_name AS owner_first_name, u.last_name AS owner_last_name, d.name AS dormitory_name
      FROM tenant_reviews tr
      JOIN users u ON tr.owner_id = u.id
      JOIN dormitories d ON tr.dormitory_id = d.id
      WHERE tr.tenant_id = ?
      ORDER BY tr.created_at DESC
    `, [req.params.tenantId]);
    
    res.json({ reviews });
  } catch (error) {
    next(error);
  }
}

async function getTenantsList(req, res, next) {
  try {
    const tenants = await query(`
      SELECT 
        u.id AS tenant_id, u.first_name, u.last_name, u.email, u.phone, u.profile_image_url, u.nickname, u.address,
        MAX(b.created_at) AS latest_booking_date,
        d.id AS dormitory_id, d.name AS dormitory_name,
        (SELECT COUNT(*) FROM tenant_reviews tr WHERE tr.owner_id = ? AND tr.tenant_id = u.id AND tr.dormitory_id = d.id) AS has_reviewed,
        (SELECT AVG(rating) FROM tenant_reviews WHERE tenant_id = u.id) AS average_rating,
        (SELECT COUNT(*) FROM tenant_reviews WHERE tenant_id = u.id) AS review_count
      FROM bookings b
      JOIN users u ON u.id = b.user_id
      JOIN rooms r ON r.id = b.room_id
      JOIN dormitories d ON r.dormitory_id = d.id
      WHERE d.owner_id = ? AND b.status = 'confirmed'
      GROUP BY u.id, d.id
      ORDER BY latest_booking_date DESC
    `, [req.user.id, req.user.id]);
    
    res.json({ tenants });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveBooking,
  createDormitory,
  createRoom,
  deleteDormitory,
  listBookings,
  listMyDormitories,
  rejectBooking,
  replyReview,
  reviewTenant,
  getTenantReviews,
  getTenantsList,
  updateBookingPayment,
  updateDormitory,
  updateRoom,
  uploadDormitoryCover,
  uploadRoomImages,
};
