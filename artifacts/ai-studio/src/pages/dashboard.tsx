import { useListConversations, useGetStats, getListConversationsQueryKey, getGetStatsQueryKey, useCreateConversation } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Terminal, MessageSquare, Activity, Plus, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: stats } = useGetStats({
    query: {
      queryKey: getGetStatsQueryKey(),
    }
  });

  const { data: conversations } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
    }
  });

  const createConversation = useCreateConversation();

  const handleNewChat = () => {
    createConversation.mutate({ data: { title: "New Session" } }, {
      onSuccess: (conv) => {
        setLocation(`/chat/${conv.id}`);
      }
    });
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
            <p className="text-muted-foreground mt-1">System status and active connections</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleNewChat} className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
              <Terminal className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalConversations || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Messages Exchanged</CardTitle>
              <MessageSquare className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalMessages || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 hover:border-border transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasks Completed</CardTitle>
              <Activity className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.completedTasks || 0} / {stats?.totalTasks || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Sessions</h2>
          <div className="grid gap-3">
            {conversations?.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-lg border-border/50 text-muted-foreground">
                No active sessions. Initialize a new connection to begin.
              </div>
            ) : (
              conversations?.slice(0, 5).map(conv => (
                <Link key={conv.id} href={`/chat/${conv.id}`} className="group flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/5 hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Terminal className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{conv.title}</h3>
                      <p className="text-sm text-muted-foreground">Updated {formatDistanceToNow(new Date(conv.updatedAt))} ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded">
                      {conv.messageCount} msgs
                    </span>
                    <PlayCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}