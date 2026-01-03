const mysql = require("mysql2/promise");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "resource_augmentation",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
};

const pool = mysql.createPool(dbConfig);

const testConnection = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting database connection (${i + 1}/${retries})...`);
      const connection = await pool.getConnection();
      console.log("Database connection successful!");
      connection.release();
      return;
    } catch (error) {
      console.error("Database connection failed:", error);
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  process.exit(1);
};

module.exports = {
  pool,
  testConnection,
};
