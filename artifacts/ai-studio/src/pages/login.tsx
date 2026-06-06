import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Terminal } from "lucide-react";

const authSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const { login } = useAuth();
  
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const onSubmit = (values: z.infer<typeof authSchema>) => {
    if (isRegister) {
      registerMutation.mutate({ data: values }, {
        onSuccess: (res) => login(res.token),
        onError: (err: any) => {
          form.setError("root", { message: err?.data?.error || "Registration failed" });
        }
      });
    } else {
      loginMutation.mutate({ data: values }, {
        onSuccess: (res) => login(res.token),
        onError: (err: any) => {
          form.setError("root", { message: err?.data?.error || "Login failed" });
        }
      });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex bg-background text-foreground relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px] opacity-50 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[128px] opacity-50 pointer-events-none" />
      
      <div className="flex-1 flex flex-col justify-center items-center p-8 z-10">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-card border border-border shadow-xl shadow-primary/10 mb-4">
              <Terminal className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
            <p className="text-muted-foreground">Log in to your workspace</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-2xl shadow-black/50">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input className="bg-background" placeholder="hacker" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input className="bg-background" type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.formState.errors.root && (
                  <div className="p-3 text-sm rounded bg-destructive/20 text-destructive-foreground border border-destructive/50">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full font-bold shadow-lg shadow-primary/20" 
                  disabled={isPending}
                >
                  {isPending ? "Connecting..." : (isRegister ? "Initialize Account" : "Access Workspace")}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <button 
                onClick={() => setIsRegister(!isRegister)}
                className="text-muted-foreground hover:text-primary transition-colors"
                type="button"
              >
                {isRegister ? "Already have access? Log in" : "Need access? Register"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
