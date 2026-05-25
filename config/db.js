const mysql = require("mysql2/promise");
const fs = require("fs");
require("dotenv").config();

function getSslConfig() {
  if (process.env.DB_SSL === "false") return undefined;

  const ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };

  if (process.env.DB_SSL_CA_PATH) {
    ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8");
  } else if (process.env.DB_SSL_CA) {
    ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
  }

  return ssl;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  ssl: getSslConfig(),
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = {
  pool,
  query,
};
