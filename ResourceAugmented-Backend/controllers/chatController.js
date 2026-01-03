// backend/controllers/ChatController.js
const ChatService = require("../services/chatService");

class ChatController {
  // Get chat history for a project
  static async getChatHistory(req, res) {
    try {
      const { projectId } = req.params;
      const limit = parseInt(req.query.limit) || 100;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: "Project ID is required",
        });
      }

      const messages = await ChatService.getChatHistory(
        parseInt(projectId),
        limit
      );

      res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      console.error("Error in getChatHistory controller:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chat history",
        error: error.message,
      });
    }
  }

  // Get unread message count
  static async getUnreadCount(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId; // From auth middleware

      console.log("📬 Getting unread count:", { projectId, userId });

      // Validate required parameters
      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          message: "Project ID and User ID are required",
        });
      }

      // ✅ No longer need lastSeenTimestamp - it's stored in the database
      const count = await ChatService.getUnreadCount(
        parseInt(projectId, 10),
        parseInt(userId, 10)
      );

      console.log("✅ Unread count:", count);

      res.status(200).json({
        success: true,
        projectId: parseInt(projectId, 10),
        unreadCount: count || 0,
      });
    } catch (error) {
      console.error("❌ Error in getUnreadCount controller:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get unread count",
        error: error.message,
      });
    }
  }
  static async markAsRead(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.userId;

      console.log("✅ Marking as read:", { projectId, userId });

      if (!projectId || !userId) {
        return res.status(400).json({
          success: false,
          message: "Project ID and User ID are required",
        });
      }

      const result = await ChatService.markAsRead(
        parseInt(projectId, 10),
        parseInt(userId, 10)
      );

      res.status(200).json({
        success: true,
        message: "Chat marked as read",
      });
    } catch (error) {
      console.error("❌ Error in markAsRead controller:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark as read",
        error: error.message,
      });
    }
  }
  // Delete message
  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId; // From auth middleware

      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: "Message ID is required",
        });
      }

      await ChatService.deleteMessage(parseInt(messageId), userId);

      res.status(200).json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("Error in deleteMessage controller:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete message",
        error: error.message,
      });
    }
  }

  // Edit message
  static async editMessage(req, res) {
    try {
      const { messageId } = req.params;
      const userId = req.user.userId; // From auth middleware
      const { message } = req.body;

      if (!messageId || !message) {
        return res.status(400).json({
          success: false,
          message: "Message ID and new message are required",
        });
      }

      const result = await ChatService.editMessage(
        parseInt(messageId),
        userId,
        message
      );

      res.status(200).json({
        success: true,
        message: "Message updated successfully",
        data: result.message,
      });
    } catch (error) {
      console.error("Error in editMessage controller:", error);
      res.status(500).json({
        success: false,
        message: "Failed to edit message",
        error: error.message,
      });
    }
  }

  // Get recent messages for multiple projects (for dashboard)
  static async getRecentMessages(req, res) {
    try {
      const { projectIds } = req.body;
      const limit = parseInt(req.query.limit) || 50;

      if (
        !projectIds ||
        !Array.isArray(projectIds) ||
        projectIds.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Project IDs array is required",
        });
      }

      const messages = await ChatService.getRecentMessages(projectIds, limit);

      res.status(200).json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      console.error("Error in getRecentMessages controller:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch recent messages",
        error: error.message,
      });
    }
  }
}

module.exports = ChatController;
