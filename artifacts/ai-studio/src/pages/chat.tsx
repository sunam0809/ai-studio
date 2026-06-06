import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { 
  useGetConversation, 
  getGetConversationQueryKey,
  useSendMessage,
  useDeleteConversation,
  getGetStatsQueryKey,
  getListConversationsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Send, Bot, User, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function Chat() {
  const { id } = useParams();
  const convId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversation, isLoading } = useGetConversation(convId, {
    query: {
      enabled: !!convId,
      queryKey: getGetConversationQueryKey(convId),
    }
  });

  const sendMessage = useSendMessage();
  const deleteConversation = useDeleteConversation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !convId) return;

    const content = input;
    setInput("");

    sendMessage.mutate({ id: convId, data: { content } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(convId) });
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      }
    });
  };

  const handleDelete = () => {
    if (!convId) return;
    deleteConversation.mutate({ id: convId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        setLocation("/");
      }
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <Terminal className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!conversation) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Session not found or connection lost.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background relative">
        <header className="flex-none p-4 border-b border-border/50 bg-background/95 backdrop-blur z-10 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-primary" />
            <h2 className="font-semibold tracking-tight">{conversation.title}</h2>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </header>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="max-w-4xl mx-auto space-y-6 pb-4">
            {conversation.messages.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                System ready. Awaiting input.
              </div>
            ) : (
              conversation.messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                    <div className="text-xs text-muted-foreground font-mono">
                      {msg.role === 'assistant' ? 'SYSTEM' : 'USER'}
                    </div>
                    <div className={`p-4 rounded-lg whitespace-pre-wrap font-mono text-sm leading-relaxed ${
                      msg.role === 'assistant' 
                        ? 'bg-card border border-border/50 shadow-sm' 
                        : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            {sendMessage.isPending && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center bg-primary/20 text-primary">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1 max-w-[80%] items-start">
                   <div className="text-xs text-muted-foreground font-mono">SYSTEM</div>
                   <div className="p-4 rounded-lg bg-card border border-border/50 shadow-sm flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                     <span className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                   </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex-none p-4 bg-background border-t border-border/50">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Execute command..."
              className="bg-card border-border pr-12 font-mono text-sm shadow-sm"
              disabled={sendMessage.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost" 
              className="absolute right-1 text-primary hover:text-primary hover:bg-primary/20"
              disabled={sendMessage.isPending || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}