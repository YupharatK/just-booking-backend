const mysql = require("mysql2/promise");
require("dotenv").config({ path: "/Users/yupharat/just-booking-backend/.env" });

async function update() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await pool.query("UPDATE rooms SET available_count = 1 WHERE available_from IS NOT NULL AND available_count = 0");
  console.log("Updated rooms");
  process.exit(0);
}

update();
