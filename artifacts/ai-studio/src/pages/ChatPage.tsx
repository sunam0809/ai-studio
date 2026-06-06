import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Show } from "@clerk/react";
import {
  useGetConversation,
  getGetConversationQueryKey,
  getListConversationsQueryKey,
  getGetConversationStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Copy, Check, Loader2, Code2, Cpu, Globe, Wrench } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const MODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  exe_dll: Cpu,
  ui_design: Wrench,
  website: Globe,
  general: Code2,
};

const MODE_LABELS: Record<string, string> = {
  exe_dll: "EXE / DLL / SYS",
  ui_design: "Program UI",
  website: "Website",
  general: "General Coding",
};

const MODE_COLORS: Record<string, string> = {
  exe_dll: "text-violet-400",
  ui_design: "text-sky-400",
  website: "text-emerald-400",
  general: "text-amber-400",
};

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/80 text-xs text-muted-foreground">
        <span>{lang || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm text-foreground bg-[#0d1117] font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const lang = lines[0]?.trim() || "";
      const code = lines.slice(1).join("\n");
      return <CodeBlock key={i} code={code} lang={lang} />;
    }
    // Render inline code and basic markdown
    const html = part
      .replace(/`([^`]+)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-sm font-mono text-sky-300">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
      .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-foreground mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-foreground mt-5 mb-2">$2</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-foreground mt-5 mb-2">$1</h1>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/\n\n/g, '<br/><br/>');
    return <span key={i} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
  });
}

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const convId = parseInt(params.id);

  const { data: conversation, isLoading } = useGetConversation(convId, {
    query: { queryKey: getGetConversationQueryKey(convId), enabled: !!convId },
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (conversation?.messages) setMessages(conversation.messages as Message[]);
  }, [conversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const content = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content }]);
    setStreaming(true);
    setStreamContent("");

    try {
      const resp = await fetch(`${BASE}/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content }),
      });
      if (!resp.ok || !resp.body) throw new Error("Request failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.content) { full += parsed.content; setStreamContent(full); }
            if (parsed.done) break;
            if (parsed.error) throw new Error(parsed.error);
          } catch {}
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
      setStreamContent("");
      qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetConversationStatsQueryKey() });
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
      setStreamContent("");
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, convId, qc]);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const ModeIcon = MODE_ICONS[conversation?.mode ?? "general"] ?? Code2;
  const modeColor = MODE_COLORS[conversation?.mode ?? "general"];

  return (
    <Show when="signed-in" fallback={<div className="min-h-screen bg-background flex items-center justify-center"><button onClick={() => setLocation("/sign-in")} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg">Sign in</button></div>}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border px-4 py-3 flex items-center gap-3 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <button onClick={() => setLocation("/")} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <ModeIcon className={`w-4 h-4 shrink-0 ${modeColor}`} />
            <span className="font-medium text-foreground text-sm truncate">{conversation?.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-secondary hidden sm:block ${modeColor}`}>
              {MODE_LABELS[conversation?.mode ?? "general"]}
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && !streaming && (
              <div className="text-center py-16 space-y-3">
                <div className={`w-14 h-14 rounded-xl bg-secondary/50 flex items-center justify-center mx-auto ${modeColor}`}>
                  <ModeIcon className="w-7 h-7" />
                </div>
                <div className="text-lg font-medium text-foreground">{conversation?.title}</div>
                <div className="text-sm text-muted-foreground">Start the conversation below</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className={`w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5 ${modeColor}`}>
                      <ModeIcon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 prose prose-sm max-w-none text-foreground">
                      {renderContent(msg.content)}
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="bg-secondary border border-border rounded-xl px-4 py-3 max-w-[80%] text-sm text-foreground">
                    {msg.content}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming */}
            {streaming && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className={`w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5 ${modeColor}`}>
                    <ModeIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {streamContent ? (
                      <div className="prose prose-sm max-w-none text-foreground">
                        {renderContent(streamContent)}
                        <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                      </div>
                    ) : (
                      <div className="flex gap-1 pt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end bg-input border border-border rounded-xl px-4 py-3 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKey}
                placeholder="Describe what you want to build..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
                style={{ minHeight: "24px", maxHeight: "160px" }}
                disabled={streaming}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Enter to send, Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </Show>
  );
}
