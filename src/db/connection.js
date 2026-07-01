import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import env from "../config/env.js";

// 1. Establish core connection configuration properties
const poolConfig = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// 2. Inject SSL criteria dynamically if your environment config requests it
if (env.DB_SSL_CA) {
  try {
    const certPath = path.resolve(env.DB_SSL_CA);

    poolConfig.ssl = {
      ca: fs.readFileSync(certPath),
    };

    console.log(
      `🔒 Production Database SSL connection initialized using: ${env.DB_SSL_CA}`,
    );
  } catch (error) {
    console.error(
      "❌ Failed to read production DB_SSL_CA certificate file:",
      error.message,
    );
    process.exit(1);
  }
}

// 3. Instantiate and export the flexible pooling utility
const pool = mysql.createPool(poolConfig);

export default pool;
