// backend/socket/socketServer.js
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const ChatService = require("../../services/chatService");

let io;
const activeUsers = new Map();
const projectRooms = new Map();
const userSockets = new Map();

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:4200",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // ✅ Authentication middleware - matches authService.js token structure
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      console.log("🔐 Authenticating socket connection...");

      if (!token) {
        console.error("❌ No token provided");
        return next(new Error("Authentication error: No token"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      socket.userId = decoded.Id || decoded.userId;
      socket.userRole = decoded.Role;
      socket.userEmail = decoded.Email;

      // Build full name from FirstName and LastName
      const firstName = decoded.FirstName || "";
      const lastName = decoded.LastName || "";

      if (firstName && lastName) {
        socket.userName = `${firstName} ${lastName}`.trim();
      } else if (firstName) {
        socket.userName = firstName;
      } else if (decoded.Email) {
        socket.userName = decoded.Email.split("@")[0];
      } else {
        socket.userName = "Unknown User";
      }

      // Validate that userId exists
      if (!socket.userId) {
        console.error("❌ userId is undefined after decoding token");
        console.error("Available token fields:", Object.keys(decoded));
        return next(
          new Error("Authentication error: Invalid token - no user ID")
        );
      }

      next();
    } catch (err) {
      console.error("❌ Socket authentication error:", err.message);
      return next(new Error("Authentication error: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userName} (ID: ${socket.userId})`);

    // Validate userId
    if (!socket.userId) {
      console.error("❌ Socket connected without userId - disconnecting");
      socket.emit("error", {
        message: "Authentication failed - please login again",
      });
      socket.disconnect();
      return;
    }

    // Store active user
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      user: {
        id: socket.userId,
        name: socket.userName,
        email: socket.userEmail,
        role: socket.userRole,
      },
    });

    userSockets.set(socket.userId, socket.id);
    io.emit(
      "users:online",
      Array.from(activeUsers.values()).map((u) => u.user)
    );
    socket.join(`user:${socket.userId}`);

    // ✅ Join project
    socket.on("project:join", async (projectId) => {
      try {
        if (!projectId) {
          console.error("❌ No projectId provided");
          socket.emit("error", { message: "Project ID is required" });
          return;
        }

        const projectIdInt = parseInt(projectId, 10);
        const roomName = `project:${projectIdInt}`;
        socket.join(roomName);

        if (!projectRooms.has(projectIdInt)) {
          projectRooms.set(projectIdInt, new Set());
        }
        projectRooms.get(projectIdInt).add(socket.userId);

        console.log(
          `📥 ${socket.userName} (ID: ${socket.userId}) joined project ${projectIdInt}`
        );

        // Load chat history
        let chatHistory = [];
        try {
          chatHistory = await ChatService.getChatHistory(projectIdInt, 100);
          console.log(
            `📜 Loaded ${chatHistory.length} messages for project ${projectIdInt}`
          );
        } catch (error) {
          console.error("❌ Error loading chat history:", error);
          chatHistory = [];
        }

        socket.emit("chat:history", chatHistory);

        // Broadcast user joined
        socket.to(roomName).emit("project:user_joined", {
          userId: socket.userId,
          userName: socket.userName,
          userRole: socket.userRole,
        });

        // Send online users
        const onlineUsers = [];
        const projectUsers = projectRooms.get(projectIdInt);
        if (projectUsers) {
          projectUsers.forEach((uid) => {
            const socketId = userSockets.get(uid);
            if (socketId) {
              onlineUsers.push({ userId: uid, socketId });
            }
          });
        }

        io.to(roomName).emit("project:online_users", onlineUsers);
      } catch (error) {
        console.error("❌ Error joining project:", error);
        socket.emit("chat:history", []);
        socket.emit("error", { message: "Failed to join project" });
      }
    });

    // ✅ Leave project
    socket.on("project:leave", (projectId) => {
      try {
        const projectIdInt = parseInt(projectId, 10);
        const roomName = `project:${projectIdInt}`;

        socket.leave(roomName);

        if (projectRooms.has(projectIdInt)) {
          projectRooms.get(projectIdInt).delete(socket.userId);
        }

        socket.to(roomName).emit("project:user_left", {
          userId: socket.userId,
          userName: socket.userName,
        });

        console.log(`📤 ${socket.userName} left project ${projectIdInt}`);
      } catch (error) {
        console.error("❌ Error leaving project:", error);
      }
    });

    // ✅ Send message
    socket.on("chat:send_message", async (data) => {
      try {
        const { projectId, message, mentions } = data;

        console.log("📨 Received chat:send_message:", {
          projectId,
          message: message ? message.substring(0, 50) : "empty",
          mentions,
          userId: socket.userId,
          userName: socket.userName,
        });

        // Validate
        if (!socket.userId) {
          console.error("❌ Socket userId is undefined");
          socket.emit("error", {
            message: "Authentication required. Please refresh.",
          });
          return;
        }

        if (!projectId || !message) {
          console.error("❌ Invalid message data");
          socket.emit("error", {
            message: "Project ID and message are required",
          });
          return;
        }

        const projectIdInt = parseInt(projectId, 10);
        const userIdInt = parseInt(socket.userId, 10);
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
          console.error("❌ Empty message");
          socket.emit("error", { message: "Message cannot be empty" });
          return;
        }

        console.log(
          `📤 ${socket.userName} (ID: ${userIdInt}) sending to project ${projectIdInt}`
        );

        // Save message
        const savedMessage = await ChatService.saveMessage({
          projectId: projectIdInt,
          userId: userIdInt,
          message: trimmedMessage,
          mentionedUsers: mentions || [],
        });

        if (!savedMessage) {
          throw new Error("Failed to save message");
        }

        console.log("✅ Message saved:", savedMessage.id);

        // Broadcast
        const roomName = `project:${projectIdInt}`;
        io.to(roomName).emit("chat:new_message", savedMessage);

        console.log(`📢 Broadcasted to room: ${roomName}`);

        // Mention notifications
        if (mentions && mentions.length > 0) {
          mentions.forEach((mentionedUserId) => {
            io.to(`user:${mentionedUserId}`).emit("notification:mention", {
              type: "mention",
              projectId: projectIdInt,
              message: `${socket.userName} mentioned you`,
              from: { id: userIdInt, name: socket.userName },
              timestamp: new Date(),
            });
          });
        }
      } catch (error) {
        console.error("❌ Error sending message:", error);
        socket.emit("error", {
          message: "Failed to send message: " + error.message,
        });
      }
    });

    // ✅ Typing indicator
    socket.on("chat:typing", (data) => {
      try {
        const { projectId } = data;
        const roomName = `project:${parseInt(projectId, 10)}`;
        socket.to(roomName).emit("chat:user_typing", {
          userId: socket.userId,
          userName: socket.userName,
          projectId: parseInt(projectId, 10),
        });
      } catch (error) {
        console.error("❌ Error handling typing:", error);
      }
    });

    // ✅ Stop typing
    socket.on("chat:stop_typing", (data) => {
      try {
        const { projectId } = data;
        const roomName = `project:${parseInt(projectId, 10)}`;
        socket.to(roomName).emit("chat:user_stop_typing", {
          userId: socket.userId,
          projectId: parseInt(projectId, 10),
        });
      } catch (error) {
        console.error("❌ Error handling stop typing:", error);
      }
    });

    // ✅ Disconnect
    socket.on("disconnect", () => {
      console.log(
        `❌ User disconnected: ${socket.userName} (ID: ${socket.userId})`
      );

      if (socket.userId) {
        activeUsers.delete(socket.userId);
        userSockets.delete(socket.userId);

        projectRooms.forEach((users, projectId) => {
          if (users.has(socket.userId)) {
            users.delete(socket.userId);
            io.to(`project:${projectId}`).emit("project:user_left", {
              userId: socket.userId,
              userName: socket.userName,
            });
          }
        });

        io.emit(
          "users:online",
          Array.from(activeUsers.values()).map((u) => u.user)
        );
      }
    });
  });

  console.log("✅ Socket.IO server initialized");
  return io;
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToProject = (projectId, event, data) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  emitToUser,
  emitToProject,
};
