const { verifyToken } = require("../utils/auth");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ message: "กรุณาเข้าสู่ระบบ" });
  }

  req.user = payload;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์ใช้งานส่วนนี้" });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
