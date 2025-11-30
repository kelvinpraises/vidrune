// IMPORTANT: Load environment variables FIRST, before any other imports
// This ensures all services have access to env vars when they initialize
import dotenv from "dotenv";
import { resolve } from "path";

const result = dotenv.config();

if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log("✅ Environment variables loaded");
}

// Now import everything else - services will have access to env vars
import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";

import adminRouter from "./routes/admin";
import marketsRouter from "./routes/markets";
import pollRouter from "./routes/poll";
import searchRouter from "./routes/search";
import storageRouter from "./routes/storage";
import videoRouter from "./routes/video";

const app: Express = express();
const PORT = process.env.PORT || 3001;

// CORS Configuration
// Allow frontend origin for API requests
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount route handlers
app.use("/api/storage", storageRouter);
app.use("/api", pollRouter); // Mount poll routes at /api root for /api/poll-updates (must be before other /api routes)
app.use("/api/video", videoRouter);
app.use("/api/markets", marketsRouter);
app.use("/api/search", searchRouter);
app.use("/api/admin", adminRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║         Vidrune Backend Server               ║
╠══════════════════════════════════════════════╣
║  Status: Running                             ║
║  Port: ${PORT}                                  ║
║  Environment: ${process.env.NODE_ENV || "development"}                    ║
║  Timestamp: ${new Date().toISOString()}         ║
╚══════════════════════════════════════════════╝

📡 Polling Mode: Frontend-triggered (serverless compatible)
   The frontend acts as a cron agent, calling /api/poll-updates
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  process.exit(0);
});
