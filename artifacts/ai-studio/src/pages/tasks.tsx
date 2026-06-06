import { useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useListTasks, 
  getListTasksQueryKey,
  useDeleteTask,
  useCancelTask,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Terminal, XCircle, Trash2, Clock, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { CreateTaskDialog } from "@/components/create-task-dialog";

export default function Tasks() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: tasks, isLoading } = useListTasks({
    query: {
      queryKey: getListTasksQueryKey(),
      refetchInterval: (query) => {
        // Poll every 3 seconds if any tasks are running or pending
        const hasActiveTasks = query.state.data?.some(t => t.status === 'running' || t.status === 'pending');
        return hasActiveTasks ? 3000 : false;
      }
    }
  });

  const deleteTask = useDeleteTask();
  const cancelTask = useCancelTask();

  const handleCancel = (id: number) => {
    cancelTask.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() })
    });
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running': return <PlayCircle className="w-4 h-4 text-primary animate-pulse" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default: return <Terminal className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <Badge variant="outline" className="bg-muted text-muted-foreground">Pending</Badge>;
      case 'running': return <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50">Running</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/50">Completed</Badge>;
      case 'failed': return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/50">Failed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-muted text-muted-foreground">Cancelled</Badge>;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Background Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage asynchronous operations</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Initialize Task
          </Button>
        </header>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="text-center p-8 text-muted-foreground">Loading processes...</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center p-12 border border-dashed rounded-lg border-border/50 text-muted-foreground">
              No tasks scheduled. Initialize a new task to run operations in the background.
            </div>
          ) : (
            tasks?.map(task => (
              <Card key={task.id} className="bg-card border-border/50 overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                      </div>
                      <CardDescription className="text-xs font-mono">
                        Started {formatDistanceToNow(new Date(task.createdAt))} ago
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(task.status)}
                      <div className="flex items-center gap-1">
                        {(task.status === 'running' || task.status === 'pending') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-warning" onClick={() => handleCancel(task.id)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <p className="text-sm text-foreground/80">{task.description}</p>
                  
                  {task.result && (
                    <div className="bg-background rounded-md p-3 border border-border/50 font-mono text-xs overflow-auto max-h-40 text-muted-foreground">
                      {task.result}
                    </div>
                  )}
                  {task.error && (
                    <div className="bg-destructive/10 rounded-md p-3 border border-destructive/20 font-mono text-xs text-destructive overflow-auto max-h-40">
                      {task.error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      
      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />
    </Layout>
  );
}