import db from "../db/connection.js";
import asyncHandler from "../utils/asyncHandler.js";

export const healthCheck = asyncHandler(async (req, res) => {
  await db.execute("SELECT 1");

  res.status(200).json({
    success: true,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node_version: process.version,
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});
