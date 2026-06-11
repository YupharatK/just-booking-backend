const { query } = require("../config/db");
const { hashPassword, signToken, verifyPassword } = require("../utils/auth");

function publicUser(user) {
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

async function register(req, res, next) {
  try {
    const {
      email,
      password,
      role = "member",
      firstName,
      lastName,
      nickname,
      phone,
      address,
      profileImageUrl,
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: "กรุณากรอกอีเมล รหัสผ่าน ชื่อ และนามสกุล" });
    }

    if (!["member", "owner"].includes(role)) {
      return res.status(400).json({ message: "สมัครได้เฉพาะสมาชิกหรือเจ้าของหอพัก" });
    }

    const result = await query(
      `INSERT INTO users
        (email, password_hash, role, first_name, last_name, nickname, phone, address, profile_image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashPassword(password),
        role,
        firstName,
        lastName,
        nickname || null,
        phone || null,
        address || null,
        profileImageUrl || null,
        role === "owner" ? "pending" : "active",
      ],
    );

    const users = await query("SELECT * FROM users WHERE id = ?", [result.insertId]);
    const token = signToken({ id: result.insertId, role, email });

    res.status(201).json({ token, user: publicUser(users[0]) });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "อีเมลนี้ถูกใช้งานแล้ว" });
    }
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "กรุณากรอกอีเมลและรหัสผ่าน" });
    }

    const users = await query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "บัญชีนี้ถูกระงับการใช้งาน" });
    }

    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.json({ token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

async function me(req, res, next) {
  try {
    const users = await query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    res.json({ user: publicUser(users[0]) });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  me,
  register,
}; #authController.js
