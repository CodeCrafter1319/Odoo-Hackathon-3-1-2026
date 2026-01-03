const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const LeaveCronService = require("./services/leaveCronService");
const LeaveCronAccrualService = require("./services/leaveAccuralService");
const { initializeSocket } = require("./server/socket/socketServer");
const http = require("http");
// Routes
const authRoutes = require("./routes/auth");
const leaveRoutes = require("./routes/leaves");
const resourceRoutes = require("./routes/resource");
const companyRoutes = require("./routes/company");
const managerRoutes = require("./routes/manager");
const projectRouter = require("./routes/projects");
const ChatRouter = require("./routes/chat");

const app = express();
const server = http.createServer(app);

const io = initializeSocket(server);

// Security middleware
app.use(helmet());

app.set("io", io);
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:4200",
      "http://localhost:4200",
      "http://localhost:8080",
      "https://resource-augmentation.netlify.app/",
      "https://*.netlify.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limit
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.url.startsWith("/api/")) {
    console.log(`${req.method} ${req.url}`);
    console.log("Request body:", req.body);
    console.log("Content-Type:", req.headers["content-type"]);
  }
  next();
});

// Route organization by role/functionality
app.use("/api/auth", authRoutes); // Core authentication
app.use("/api/leave", leaveRoutes); // Leave management
app.use("/api/resource", resourceRoutes); // Resource-specific
app.use("/api/company", companyRoutes); // Company/Admin-specific
app.use("/api/manager", managerRoutes); // Manager-specific
app.use("/api/projects", projectRouter); // Project management
app.use("/api/chat", ChatRouter); //chat Routes 
// Health Check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
    websocket: "enabled",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: "Routes not found",
    timestamp: new Date().toISOString(),
  });
});

//Initialize cron jobs
LeaveCronService.initializeCronJobs();
LeaveCronAccrualService.initializeAccrualJobs();

module.exports = app;
module.exports.server = server;
module.exports.io = io;
