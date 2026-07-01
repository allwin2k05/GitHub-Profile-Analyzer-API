import pool from "./connection.js";

export async function connectWithRetry(retries = 10, delay = 5000) {
  while (retries) {
    try {
      await pool.query("SELECT 1");
      console.log("Database connected");
      return;
    } catch (err) {
      console.log(`DB not ready. Retrying in ${delay / 1000}s...`);

      retries--;

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Database unavailable");
}
