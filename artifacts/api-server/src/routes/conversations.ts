import { Router, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

const SYSTEM_PROMPTS: Record<string, string> = {
  exe_dll: `You are an expert systems programmer specializing in Windows native development. You can create:
- EXE files (Windows executables) in C/C++ with full source code and build instructions (MSVC/MinGW/CMake)
- DLL files (Dynamic Link Libraries) with exported functions, headers, and usage examples
- SYS files (Windows kernel drivers) with WDK setup instructions
- Assembly code for low-level tasks

Always provide:
1. Complete, compilable source code
2. Step-by-step build instructions (compiler commands, CMakeLists.txt, Visual Studio project setup)
3. How to use/test the generated file
4. Any dependencies or SDK requirements

Be thorough and provide production-quality code.`,

  ui_design: `You are an expert UI/UX developer who creates beautiful program interfaces. You can design and code:
- Windows Forms (C# / .NET) applications
- WPF (Windows Presentation Foundation) with XAML
- Qt applications (C++ / Python / QML)
- Electron apps (HTML/CSS/JS/TypeScript)
- Win32 native UI (C/C++)

Always provide:
1. Complete source code for the UI
2. How to build and run it
3. Design rationale and customization tips

Focus on clean, modern, professional UI design.`,

  website: `You are an expert full-stack web developer who builds complete websites and web applications. You can create:
- Static websites (HTML/CSS/JavaScript)
- React applications with hooks, routing, state management
- Next.js apps (SSR, SSG, API routes)
- Node.js / Express backends
- Full-stack apps with databases

Always provide:
1. Complete, runnable code
2. File structure overview
3. Setup and run instructions

Write clean, modern, production-ready code.`,

  general: `You are an expert software engineer and coding assistant. You can help with:
- Any programming language (Python, JavaScript, TypeScript, C/C++, Rust, Go, Java, C#, etc.)
- Algorithms, data structures, design patterns
- Debugging and fixing code
- Architecture and system design
- DevOps, CI/CD, containerization

Provide clear explanations, working code examples, and best practices.`,
};

// GET /conversations
router.get("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const convos = await db
      .select({
        id: conversationsTable.id,
        title: conversationsTable.title,
        mode: conversationsTable.mode,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        messageCount: count(messagesTable.id),
      })
      .from(conversationsTable)
      .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
      .where(eq(conversationsTable.userId, req.userId!))
      .groupBy(conversationsTable.id)
      .orderBy(desc(conversationsTable.updatedAt));

    res.json(convos);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// GET /conversations/stats
router.get("/stats", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalConvosRow] = await db
      .select({ count: count() })
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, req.userId!));

    const [totalMsgsRow] = await db
      .select({ count: count() })
      .from(messagesTable)
      .innerJoin(conversationsTable, eq(messagesTable.conversationId, conversationsTable.id))
      .where(eq(conversationsTable.userId, req.userId!));

    const byModeRows = await db
      .select({ mode: conversationsTable.mode, count: count() })
      .from(conversationsTable)
      .where(eq(conversationsTable.userId, req.userId!))
      .groupBy(conversationsTable.mode);

    const byMode: Record<string, number> = { exe_dll: 0, ui_design: 0, website: 0, general: 0 };
    for (const row of byModeRows) {
      byMode[row.mode] = row.count;
    }

    const recentConversations = await db
      .select({
        id: conversationsTable.id,
        title: conversationsTable.title,
        mode: conversationsTable.mode,
        createdAt: conversationsTable.createdAt,
        updatedAt: conversationsTable.updatedAt,
        messageCount: count(messagesTable.id),
      })
      .from(conversationsTable)
      .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
      .where(eq(conversationsTable.userId, req.userId!))
      .groupBy(conversationsTable.id)
      .orderBy(desc(conversationsTable.updatedAt))
      .limit(5);

    res.json({
      totalConversations: totalConvosRow?.count ?? 0,
      totalMessages: totalMsgsRow?.count ?? 0,
      byMode,
      recentConversations,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// POST /conversations
router.post("/", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, mode } = req.body;
    if (!title || !mode) {
      res.status(400).json({ error: "title and mode required" });
      return;
    }
    const [convo] = await db
      .insert(conversationsTable)
      .values({ title, mode, userId: req.userId! })
      .returning();
    res.status(201).json({ ...convo, messageCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// GET /conversations/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));

    if (!convo || convo.userId !== req.userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json({ ...convo, messages });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// DELETE /conversations/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));

    if (!convo || convo.userId !== req.userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// GET /conversations/:id/messages
router.get("/:id/messages", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));

    if (!convo || convo.userId !== req.userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    res.json(messages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// POST /conversations/:id/messages — SSE streaming
router.post("/:id/messages", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = parseInt(req.params["id"] as string);
  const { content } = req.body;

  if (!content) {
    res.status(400).json({ error: "content required" });
    return;
  }

  try {
    const [convo] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, id));

    if (!convo || convo.userId !== req.userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.insert(messagesTable).values({ conversationId: id, role: "user", content });

    const history = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);

    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPTS[convo.mode] ?? SYSTEM_PROMPTS.general },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: fullResponse });
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, id));

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    req.log.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message" });
    } else {
      const msg = err instanceof Error ? err.message : "Unknown error";
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
      res.end();
    }
  }
});

export default router;
