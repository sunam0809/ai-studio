import { useState } from "react";
import { useLocation } from "wouter";
import { useClerk, Show, useUser } from "@clerk/react";
import {
  useListConversations,
  useCreateConversation,
  useDeleteConversation,
  useGetConversationStats,
  getListConversationsQueryKey,
  getGetConversationStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, LogOut, MessageSquare, Code2, Globe, Cpu, Wrench, ChevronRight, X } from "lucide-react";

const MODES = [
  {
    id: "exe_dll",
    label: "EXE / DLL / SYS",
    description: "Generate Windows executables, DLLs, system drivers in C/C++",
    icon: Cpu,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30 hover:border-violet-400/60",
    iconColor: "text-violet-400",
    badge: "Native",
  },
  {
    id: "ui_design",
    label: "Program UI",
    description: "Design WinForms, WPF, Qt, Electron interfaces with full source",
    icon: Wrench,
    color: "from-sky-500/20 to-sky-600/10 border-sky-500/30 hover:border-sky-400/60",
    iconColor: "text-sky-400",
    badge: "GUI",
  },
  {
    id: "website",
    label: "Website",
    description: "Build complete websites: React, Next.js, HTML/CSS/JS, Node.js",
    icon: Globe,
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 hover:border-emerald-400/60",
    iconColor: "text-emerald-400",
    badge: "Web",
  },
  {
    id: "general",
    label: "General Coding",
    description: "Any language: Python, TypeScript, Rust, Go, Java, C# and more",
    icon: Code2,
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30 hover:border-amber-400/60",
    iconColor: "text-amber-400",
    badge: "All",
  },
];

const MODE_LABELS: Record<string, string> = {
  exe_dll: "EXE/DLL",
  ui_design: "UI",
  website: "Web",
  general: "Code",
};

const MODE_COLORS: Record<string, string> = {
  exe_dll: "bg-violet-500/15 text-violet-400 border border-violet-500/30",
  ui_design: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
  website: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  general: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
};

function formatDate(d: string) {
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const qc = useQueryClient();

  const [newTitle, setNewTitle] = useState("");
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: conversations = [] } = useListConversations();
  const { data: stats } = useGetConversationStats();
  const createMutation = useCreateConversation();
  const deleteMutation = useDeleteConversation();

  function startNewChat(mode: string) {
    setSelectedMode(mode);
    setNewTitle("");
    setShowModal(true);
  }

  function handleCreate() {
    if (!selectedMode || !newTitle.trim()) return;
    createMutation.mutate(
      { data: { title: newTitle.trim(), mode: selectedMode } },
      {
        onSuccess: (conv) => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetConversationStatsQueryKey() });
          setShowModal(false);
          setLocation(`/chat/${conv.id}`);
        },
      }
    );
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetConversationStatsQueryKey() });
          setDeleteId(null);
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">AI Studio</span>
        </div>
        <Show when="signed-in">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {user?.username || user?.firstName || "User"}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </Show>
        <Show when="signed-out">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/sign-in")}
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-secondary transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => setLocation("/sign-up")}
              className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Sign up
            </button>
          </div>
        </Show>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — shown only when signed in */}
        <Show when="signed-in">
          <aside className="w-72 border-r border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto hidden lg:flex">
            <div className="p-4 border-b border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Overview</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-foreground">{stats?.totalConversations ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Chats</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="text-xl font-bold text-foreground">{stats?.totalMessages ?? 0}</div>
                  <div className="text-xs text-muted-foreground">Messages</div>
                </div>
              </div>
              {stats && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(stats.byMode).map(([mode, cnt]) => cnt > 0 && (
                    <span key={mode} className={`text-xs px-2 py-0.5 rounded-full ${MODE_COLORS[mode]}`}>
                      {MODE_LABELS[mode]} {cnt}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 p-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">Recent</div>
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No conversations yet</div>
              ) : (
                <div className="space-y-0.5">
                  {conversations.map((c) => (
                    <div
                      key={c.id}
                      className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary/60 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/chat/${c.id}`)}
                    >
                      <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${MODE_COLORS[c.mode]}`}>
                        {MODE_LABELS[c.mode]}
                      </span>
                      <span className="flex-1 text-sm text-foreground truncate">{c.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground hidden group-hover:block">
                          {formatDate(c.updatedAt)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </Show>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 gap-10">
          <div className="max-w-3xl w-full space-y-10">
            {/* Hero */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                What do you want to build?
              </h1>
              <p className="text-muted-foreground text-lg">
                Generate executables, design UIs, build websites, or get coding help.
              </p>
            </div>

            {/* Mode cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      if (!user) { setLocation("/sign-up"); return; }
                      startNewChat(mode.id);
                    }}
                    className={`group relative flex flex-col gap-3 p-5 rounded-xl border bg-gradient-to-br ${mode.color} text-left transition-all duration-200 hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center ${mode.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-black/20 ${mode.iconColor}`}>
                        {mode.badge}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{mode.label}</div>
                      <div className="text-sm text-muted-foreground mt-1">{mode.description}</div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${mode.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      Start chatting <ChevronRight className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Recent — mobile only */}
            <Show when="signed-in">
              {conversations.length > 0 && (
                <div className="lg:hidden">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent</div>
                  <div className="space-y-1">
                    {conversations.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setLocation(`/chat/${c.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        <span className={`text-xs px-1.5 py-0.5 rounded ${MODE_COLORS[c.mode]}`}>
                          {MODE_LABELS[c.mode]}
                        </span>
                        <span className="flex-1 text-sm text-foreground truncate">{c.title}</span>
                        <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Show>
          </div>
        </main>
      </div>

      {/* New chat modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-foreground text-lg">New chat</h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Mode</label>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMode(m.id)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${selectedMode === m.id ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground"}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1.5">Title</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Windows clipboard manager"
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || createMutation.isPending}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {createMutation.isPending ? "Creating..." : "Start chat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-2">Delete conversation?</h3>
            <p className="text-sm text-muted-foreground mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-border rounded-lg py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-destructive text-white rounded-lg py-2 text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
