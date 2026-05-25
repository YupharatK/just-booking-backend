const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initDatabase } = require("./database/init");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ name: "Just Booking API", status: "ok" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api", userRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "ไม่พบ API ที่เรียกใช้งาน" });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "เกิดข้อผิดพลาดในระบบ",
  });
});

async function start() {
  await initDatabase();
  app.listen(port, () => {
    console.log(`Just Booking API is running on port ${port}`);
  });
}

start().catch((error) => {
  console.error("Cannot start server:", error);
  process.exit(1);
});
