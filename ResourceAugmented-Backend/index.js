require("dotenv").config();
const http = require("http");
const app = require("./app");
const { testConnection } = require("./config/database");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const startServer = async () => {
  try {
    await testConnection();
    
    // Get the server from app.js (not app directly)
    const server = app.server; // This is the HTTP server with Socket.IO
    
    server.listen(PORT, HOST, () => {
      console.log(`✅ Server running on ${HOST}:${PORT}`);
      console.log(`🔌 WebSocket server ready on ws://${HOST}:${PORT}`);
      console.log(`📖 API Documentation: http://${HOST}:${PORT}/api/health`);
    });

  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
};

startServer();
