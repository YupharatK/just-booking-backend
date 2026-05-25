const { pool } = require("../config/db");
const { hashPassword } = require("../utils/auth");

async function initDatabase() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('member','owner','admin') NOT NULL DEFAULT 'member',
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      nickname VARCHAR(100),
      phone VARCHAR(50),
      address TEXT,
      profile_image_url TEXT,
      status ENUM('pending','active','suspended') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS dormitories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      name VARCHAR(191) NOT NULL,
      description TEXT,
      address TEXT NOT NULL,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      distance_from_university_km DECIMAL(8, 2),
      facilities JSON,
      security_features JSON,
      rental_terms TEXT,
      rules TEXT,
      cover_image_url TEXT,
      status ENUM('pending','approved','rejected','inactive') NOT NULL DEFAULT 'pending',
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_dorm_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS rooms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dormitory_id INT NOT NULL,
      room_number VARCHAR(100),
      room_type VARCHAR(100) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      available_count INT NOT NULL DEFAULT 1,
      status ENUM('available','reserved','occupied','unavailable') NOT NULL DEFAULT 'available',
      available_from DATE,
      facilities JSON,
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_room_dorm FOREIGN KEY (dormitory_id) REFERENCES dormitories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS room_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      image_url TEXT NOT NULL,
      cloudinary_public_id VARCHAR(255),
      sort_order TINYINT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_room_image FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS favorites (
      user_id INT NOT NULL,
      dormitory_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, dormitory_id),
      CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_favorite_dorm FOREIGN KEY (dormitory_id) REFERENCES dormitories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      room_id INT NOT NULL,
      move_in_date DATE,
      note TEXT,
      status ENUM('pending_payment','paid','confirmed','cancelled','rejected') NOT NULL DEFAULT 'pending_payment',
      total_amount DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_booking_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL UNIQUE,
      amount DECIMAL(10, 2) NOT NULL,
      method ENUM('qr_code','bank_transfer','cash') NOT NULL DEFAULT 'qr_code',
      qr_code_url TEXT,
      slip_image_url TEXT,
      status ENUM('pending','submitted','verified','rejected') NOT NULL DEFAULT 'pending',
      paid_at DATETIME,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      dormitory_id INT NOT NULL,
      rating TINYINT NOT NULL,
      comment TEXT,
      owner_reply TEXT,
      status ENUM('visible','hidden','reported') NOT NULL DEFAULT 'visible',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_review_dorm FOREIGN KEY (dormitory_id) REFERENCES dormitories(id) ON DELETE CASCADE,
      CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(80) NOT NULL DEFAULT 'general',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      room_id INT NOT NULL,
      title VARCHAR(191) NOT NULL,
      description TEXT,
      status ENUM('open','in_progress','done','cancelled') NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_maintenance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_maintenance_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  await pool.query("ALTER TABLE dormitories ADD COLUMN cover_image_public_id VARCHAR(255) NULL").catch(ignoreDuplicateColumn);
  await pool.query("ALTER TABLE rooms ADD COLUMN image_public_id VARCHAR(255) NULL").catch(ignoreDuplicateColumn);

  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    await pool.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, status)
       VALUES (?, ?, 'admin', ?, ?, 'active')
       ON DUPLICATE KEY UPDATE role = 'admin', status = 'active'`,
      [
        process.env.ADMIN_EMAIL,
        hashPassword(process.env.ADMIN_PASSWORD),
        process.env.ADMIN_FIRST_NAME || "System",
        process.env.ADMIN_LAST_NAME || "Admin",
      ],
    );
  }
}

function ignoreDuplicateColumn(error) {
  if (error.code !== "ER_DUP_FIELDNAME") throw error;
}

module.exports = {
  initDatabase,
};
