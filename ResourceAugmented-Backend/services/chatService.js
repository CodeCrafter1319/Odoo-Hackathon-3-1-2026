const ProjectChat = require("../models/ProjectChat");
const User = require("../models/User");

class ChatService {
  // ✅ Fix getChatHistory to ensure limit is always a number
  static async getChatHistory(projectId, limit = 100) {
    try {
      // Ensure limit is a valid number
      const validLimit = typeof limit === "number" && limit > 0 ? limit : 100;

      console.log("📚 Fetching chat history:", {
        projectId,
        limit: validLimit,
      });

      const messages = await ProjectChat.findByProjectId(projectId, validLimit);
      return messages;
    } catch (error) {
      console.error("Error in getChatHistory:", error);
      return [];
    }
  }

  // ✅ FIXED: Simply return the result from ProjectChat.create
  static async saveMessage(data) {
    const { projectId, userId, message, mentionedUsers = [] } = data;

    try {
      console.log("💾 Saving message:", {
        projectId,
        userId,
        messageLength: message?.length,
      });

      // ProjectChat.create already returns the complete formatted message object
      const newMessage = await ProjectChat.create({
        ProjectId: projectId,
        UserId: userId,
        Message: message,
        MentionedUsers: mentionedUsers,
      });

      console.log("✅ Message saved successfully:", {
        id: newMessage.id,
        message: newMessage.message,
      });

      return newMessage; // ← Just return it directly!
    } catch (error) {
      console.error("Error in saveMessage:", error);
      throw new Error("Failed to save message");
    }
  }

  static async getUserInfo(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return null;
      }

      return {
        userId: user.Id,
        userName: `${user.FirstName} ${user.LastName}`.trim(),
        userRole: user.Role,
        email: user.Email,
      };
    } catch (error) {
      console.error("Error in getUserInfo:", error);
      return null;
    }
  }

  static async deleteMessage(messageId, userId) {
    try {
      await ProjectChat.softDelete(messageId, userId);
      return { success: true };
    } catch (error) {
      console.error("Error in deleteMessage:", error);
      throw new Error("Failed to delete message");
    }
  }

  static async editMessage(messageId, userId, newMessage) {
    try {
      await ProjectChat.update(messageId, userId, newMessage);
      const updatedMessage = await ProjectChat.findById(messageId);
      return { success: true, message: updatedMessage };
    } catch (error) {
      console.error("Error in editMessage:", error);
      throw new Error("Failed to edit message");
    }
  }

  static async getUnreadCount(projectId, userId) {
    try {
      console.log("📬 ChatService.getUnreadCount called:", {
        projectId,
        userId,
      });

      // Validate inputs
      if (!projectId || !userId) {
        console.error("❌ Missing projectId or userId");
        return 0;
      }

      const count = await ProjectChat.getUnreadCount(
        parseInt(projectId, 10),
        parseInt(userId, 10)
      );

      console.log("✅ Unread count result:", count);
      return count;
    } catch (error) {
      console.error("❌ Error in getUnreadCount:", error);
      return 0;
    }
  }
  static async markAsRead(projectId, userId) {
    try {
      console.log("✅ Marking chat as read:", { projectId, userId });

      const success = await ProjectChat.updateLastSeen(
        parseInt(projectId, 10),
        parseInt(userId, 10)
      );

      return { success };
    } catch (error) {
      console.error("❌ Error marking as read:", error);
      throw new Error("Failed to mark as read");
    }
  }
  static async getRecentMessages(projectIds, limit = 50) {
    try {
      const messages = await ProjectChat.getRecentMessagesByProjects(
        projectIds,
        limit
      );
      return messages;
    } catch (error) {
      console.error("Error in getRecentMessages:", error);
      return [];
    }
  }
}

module.exports = ChatService;
