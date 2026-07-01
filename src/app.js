import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import helmet from "helmet";
import rateLimit from "express-rate-limit";

import env from "./config/env.js";

import userRoutes from "./routes/userRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

import { connectWithRetry } from "./db/connectWithRetry.js";

import AppError from "./utils/AppError.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security hardening
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "'unsafe-inline'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "https://github.com",
          "https://avatars.githubusercontent.com",
          "https://*.githubusercontent.com",
          "https://identicons.github.com",
        ],
        connectSrc: ["'self'"],
      },
    },
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

// Request body limits
app.use(
  express.json({
    limit: "10kb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10kb",
  }),
);

app.use(morgan("dev"));

const publicPath = path.join(__dirname, "public");
console.log(`[DEBUG] Serving static files from: ${publicPath}`);

// Explicit routes for the frontend dashboard assets
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/style.css", (req, res) => {
  res.setHeader("Content-Type", "text/css");
  res.sendFile(path.join(publicPath, "style.css"));
});

app.get("/dashboard.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(publicPath, "dashboard.js"));
});

app.use(express.static(publicPath));

await connectWithRetry();

app.use("/api/users", userRoutes);
app.use("/health", healthRoutes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// Global error handler
app.use(errorHandler);

const PORT = env.PORT;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
