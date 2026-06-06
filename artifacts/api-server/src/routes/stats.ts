import { Router } from "express";
import { db, conversationsTable, messagesTable, tasksTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [{ count: totalConvs }] = await db
      .select({ count: count() })
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, req.userId!));

    const convIds = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, req.userId!));

    let totalMessages = 0;
    if (convIds.length > 0) {
      for (const conv of convIds) {
        const [{ count: msgCount }] = await db
          .select({ count: count() })
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, conv.id));
        totalMessages += Number(msgCount);
      }
    }

    const [{ count: totalTasks }] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.userId, req.userId!));

    const [{ count: completedTasks }] = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.userId, req.userId!));

    res.json({
      totalConversations: Number(totalConvs),
      totalMessages,
      totalTasks: Number(totalTasks),
      completedTasks: Number(completedTasks),
    });
  } catch (err) {
    logger.error({ err }, "Stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
