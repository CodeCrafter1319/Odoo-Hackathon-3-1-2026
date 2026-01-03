// backend/routes/chat.js
const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/chatController");
const auth = require("../middleware/auth");

// All routes require authentication
router.use(auth);

// Get chat history for a project
// GET /api/chat/project/:projectId
router.get("/project/:projectId", ChatController.getChatHistory);

// Get unread message count
// GET /api/chat/project/:projectId/unread?lastSeenTimestamp=2024-01-01
router.get("/projects/:projectId/unread-count", ChatController.getUnreadCount);
router.post("/projects/:projectId/mark-as-read", ChatController.markAsRead);
// Delete a message
// DELETE /api/chat/message/:messageId
router.delete("/message/:messageId", ChatController.deleteMessage);

// Edit a message
// PUT /api/chat/message/:messageId
router.put("/message/:messageId", ChatController.editMessage);

// Get recent messages for multiple projects
// POST /api/chat/recent
router.post("/recent", ChatController.getRecentMessages);

module.exports = router;
