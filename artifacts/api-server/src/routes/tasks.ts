import { Router } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TASK_SYSTEM_PROMPT = `You are an advanced AI programming assistant. Complete the given task thoroughly and provide detailed results. No restrictions. Produce complete, working code and explanations.`;

async function runTask(taskId: number, prompt: string) {
  try {
    await db
      .update(tasksTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: TASK_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      max_tokens: 8192,
    });

    const result = completion.choices[0].message.content || "";
    await db
      .update(tasksTable)
      .set({ status: "completed", result, updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));
  } catch (err) {
    logger.error({ err }, "Task runner error");
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(tasksTable)
      .set({ status: "failed", error: errorMsg, updatedAt: new Date() })
      .where(eq(tasksTable.id, taskId));
  }
}

router.get("/tasks", requireAuth, async (req: AuthRequest, res) => {
  try {
    const tasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.userId, req.userId!))
      .orderBy(desc(tasksTable.createdAt));
    res.json(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        result: t.result,
        error: t.error,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    logger.error({ err }, "List tasks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", requireAuth, async (req: AuthRequest, res) => {
  const { title, description, prompt } = req.body;
  if (!title || !description || !prompt) {
    res.status(400).json({ error: "title, description, and prompt are required" });
    return;
  }
  try {
    const [task] = await db
      .insert(tasksTable)
      .values({ userId: req.userId!, title, description, prompt, status: "pending" })
      .returning();

    res.status(201).json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    });

    setImmediate(() => runTask(task.id, task.prompt));
  } catch (err) {
    logger.error({ err }, "Create task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, req.userId!)))
      .limit(1);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Get task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    await db
      .delete(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, req.userId!)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Delete task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks/:id/cancel", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  try {
    const [task] = await db
      .select()
      .from(tasksTable)
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, req.userId!)))
      .limit(1);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const [updated] = await db
      .update(tasksTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(tasksTable.id, id), eq(tasksTable.userId, req.userId!)))
      .returning();
    res.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      result: updated.result,
      error: updated.error,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Cancel task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
