import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Terminal, ListTodo, LogOut, MessageSquare, Plus } from "lucide-react";
import { useLogout } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: localLogout } = useAuth();
  const [location] = useLocation();
  const { mutate: apiLogout } = useLogout();

  const handleLogout = () => {
    apiLogout(undefined, {
      onSettled: () => {
        localLogout();
      }
    });
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Terminal className="w-6 h-6 text-primary" />
          <span className="font-bold tracking-tight text-lg">AI Studio</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === '/' ? 'bg-primary/10 text-primary' : 'hover:bg-accent/5 text-muted-foreground hover:text-foreground'}`}>
            <Terminal className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <Link href="/tasks" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === '/tasks' ? 'bg-primary/10 text-primary' : 'hover:bg-accent/5 text-muted-foreground hover:text-foreground'}`}>
            <ListTodo className="w-4 h-4" />
            <span>Tasks</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium truncate px-2">{user.username}</span>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
