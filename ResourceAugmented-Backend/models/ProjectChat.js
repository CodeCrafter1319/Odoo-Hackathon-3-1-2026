// models/ProjectChat.js
const { pool } = require("../config/database");

class ProjectChat {
  // ✅ Get chat history for a project
  static async findByProjectId(projectId, limit = 100) {
    const projectIdInt = parseInt(projectId, 10);
    const limitInt = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500)); // safety cap

    const query = `
    SELECT
      pc.MessageId,
      pc.ProjectId,
      pc.UserId,
      pc.Message,
      pc.MentionedUsers,
      pc.CreatedAt,
      pc.IsEdited,
      pc.IsDeleted,
      u.FirstName,
      u.LastName,
      u.Role,
      u.Email
    FROM ProjectChat pc
    INNER JOIN Users u ON pc.UserId = u.Id
    WHERE pc.ProjectId = ?
      AND pc.IsDeleted = 0
    ORDER BY pc.CreatedAt ASC
    LIMIT ${limitInt}
  `;

    const [rows] = await pool.execute(query, [projectIdInt]);
    return rows;
  }

  // ✅ Create a new chat message
  static async create(messageData) {
    const { ProjectId, UserId, Message, MentionedUsers } = messageData;

    if (
      ProjectId === undefined ||
      UserId === undefined ||
      Message === undefined
    ) {
      console.error("❌ Missing required parameters:", {
        ProjectId,
        UserId,
        Message,
      });
      throw new Error("ProjectId, UserId, and Message are required");
    }

    console.log("📝 Creating message in database:", {
      ProjectId,
      UserId,
      Message,
      MentionedUsers,
    });

    const query = `
      INSERT INTO ProjectChat
      (ProjectId, UserId, Message, MentionedUsers, CreatedAt, IsEdited, IsDeleted)
      VALUES (?, ?, ?, ?, NOW(), 0, 0)
    `;

    try {
      const mentionedUsersJson =
        MentionedUsers && MentionedUsers.length > 0
          ? JSON.stringify(MentionedUsers)
          : null;

      // ✅ Convert IDs to integers
      const projectIdInt = parseInt(ProjectId, 10);
      const userIdInt = parseInt(UserId, 10);

      const [result] = await pool.execute(query, [
        projectIdInt,
        userIdInt,
        Message,
        mentionedUsersJson,
      ]);

      console.log("✅ INSERT successful, insertId:", result.insertId);

      // Fetch the created message with user info
      const [messages] = await pool.execute(
        `
        SELECT
          pc.MessageId,
          pc.ProjectId,
          pc.UserId,
          pc.Message,
          pc.MentionedUsers,
          pc.CreatedAt,
          pc.IsEdited,
          pc.IsDeleted,
          u.FirstName,
          u.LastName,
          u.Role,
          u.Email
        FROM ProjectChat pc
        INNER JOIN Users u ON pc.UserId = u.Id
        WHERE pc.MessageId = ?
      `,
        [result.insertId]
      );

      if (messages.length === 0) {
        console.error("⚠️ Message created but not found!");
        return null;
      }

      const row = messages[0];
      return {
        id: row.MessageId,
        projectId: row.ProjectId,
        userId: row.UserId,
        userName: `${row.FirstName} ${row.LastName}`.trim(),
        userRole: row.Role,
        userEmail: row.Email,
        message: row.Message,
        mentionedUsers: row.MentionedUsers
          ? JSON.parse(row.MentionedUsers)
          : [],
        timestamp: row.CreatedAt,
        isEdited: row.IsEdited,
      };
    } catch (error) {
      console.error("❌ Error creating chat message:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        sql: error.sql,
      });
      throw error;
    }
  }

  // ✅ Soft delete a message
  static async softDelete(messageId, userId) {
    const query = `
      UPDATE ProjectChat
      SET IsDeleted = 1
      WHERE MessageId = ? AND UserId = ?
    `;

    try {
      const messageIdInt = parseInt(messageId, 10);
      const userIdInt = parseInt(userId, 10);

      const [result] = await pool.execute(query, [messageIdInt, userIdInt]);

      if (result.affectedRows === 0) {
        throw new Error("Message not found or unauthorized");
      }

      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error("❌ Error deleting message:", error);
      throw error;
    }
  }

  // ✅ Update a message
  static async update(messageId, userId, newMessage) {
    const query = `
      UPDATE ProjectChat
      SET Message = ?, IsEdited = 1
      WHERE MessageId = ? AND UserId = ? AND IsDeleted = 0
    `;

    try {
      const messageIdInt = parseInt(messageId, 10);
      const userIdInt = parseInt(userId, 10);

      const [result] = await pool.execute(query, [
        newMessage,
        messageIdInt,
        userIdInt,
      ]);

      if (result.affectedRows === 0) {
        throw new Error("Message not found or unauthorized");
      }

      return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
      console.error("❌ Error updating message:", error);
      throw error;
    }
  }

  // ✅ Get unread count
  static async getUnreadCount(projectId, userId) {
    const query = `
      SELECT COUNT(*) as count
      FROM ProjectChat pc
      WHERE pc.ProjectId = ?
        AND pc.UserId != ?
        AND pc.IsDeleted = 0
        AND pc.CreatedAt > COALESCE(
          (SELECT LastSeenAt 
           FROM ProjectChatReadStatus 
           WHERE ProjectId = ? AND UserId = ?),
          '1970-01-01 00:00:00'
        )
    `;

    try {
      console.log("🔍 SQL Query for unread count:", {
        projectId,
        userId,
      });

      const projectIdInt = parseInt(projectId, 10);
      const userIdInt = parseInt(userId, 10);

      const [rows] = await pool.execute(query, [
        projectIdInt,
        userIdInt,
        projectIdInt,
        userIdInt,
      ]);

      console.log("✅ Unread count query result:", rows[0]);
      return rows[0]?.count || 0;
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      return 0;
    }
  }
  static async updateLastSeen(projectId, userId) {
    const query = `
      INSERT INTO ProjectChatReadStatus (ProjectId, UserId, LastSeenAt)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE LastSeenAt = NOW()
    `;

    try {
      const projectIdInt = parseInt(projectId, 10);
      const userIdInt = parseInt(userId, 10);

      await pool.execute(query, [projectIdInt, userIdInt]);

      console.log("✅ Last seen updated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error updating last seen:", error);
      return false;
    }
  }
  static async getLastSeen(projectId, userId) {
    const query = `
      SELECT LastSeenAt
      FROM ProjectChatReadStatus
      WHERE ProjectId = ? AND UserId = ?
    `;

    try {
      const projectIdInt = parseInt(projectId, 10);
      const userIdInt = parseInt(userId, 10);

      const [rows] = await pool.execute(query, [projectIdInt, userIdInt]);

      if (rows.length > 0) {
        return rows[0].LastSeenAt;
      }

      return null; // User has never viewed this project's chat
    } catch (error) {
      console.error("❌ Error getting last seen:", error);
      return null;
    }
  }
  static async findById(messageId) {
    const query = `
      SELECT
        pc.*,
        u.FirstName,
        u.LastName,
        u.Role,
        u.Email
      FROM ProjectChat pc
      INNER JOIN Users u ON pc.UserId = u.Id
      WHERE pc.MessageId = ?
    `;

    try {
      const messageIdInt = parseInt(messageId, 10);
      const [rows] = await pool.execute(query, [messageIdInt]);

      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        id: row.MessageId,
        projectId: row.ProjectId,
        userId: row.UserId,
        userName: `${row.FirstName} ${row.LastName}`.trim(),
        userRole: row.Role,
        message: row.Message,
        mentionedUsers: row.MentionedUsers
          ? JSON.parse(row.MentionedUsers)
          : [],
        timestamp: row.CreatedAt,
        isEdited: row.IsEdited,
        isDeleted: row.IsDeleted,
      };
    } catch (error) {
      console.error("❌ Error fetching message by ID:", error);
      throw error;
    }
  }

  static async getRecentMessagesByProjects(projectIds, limit = 50) {
    if (!projectIds || projectIds.length === 0) {
      return [];
    }

    const placeholders = projectIds.map(() => "?").join(",");
    const query = `
      SELECT
        pc.MessageId,
        pc.ProjectId,
        pc.UserId,
        pc.Message,
        pc.CreatedAt,
        u.FirstName,
        u.LastName,
        u.Role
      FROM ProjectChat pc
      INNER JOIN Users u ON pc.UserId = u.Id
      WHERE pc.ProjectId IN (${placeholders})
        AND pc.IsDeleted = 0
      ORDER BY pc.CreatedAt DESC
      LIMIT ?
    `;

    try {
      // ✅ Convert all parameters to integers
      const projectIdsInt = projectIds.map((id) => parseInt(id, 10));
      const limitInt = parseInt(limit, 10);

      const [rows] = await pool.execute(query, [...projectIdsInt, limitInt]);

      return rows.map((row) => ({
        id: row.MessageId,
        projectId: row.ProjectId,
        userId: row.UserId,
        userName: `${row.FirstName} ${row.LastName}`.trim(),
        userRole: row.Role,
        message: row.Message,
        timestamp: row.CreatedAt,
      }));
    } catch (error) {
      console.error("❌ Error fetching recent messages:", error);
      throw error;
    }
  }
}

module.exports = ProjectChat;
