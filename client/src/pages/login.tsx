import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Define the form schema
const formSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

type FormValues = z.infer<typeof formSchema>;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      console.log("Tentando fazer login com:", data.username);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro de login:", response.status, errorText);
        throw new Error(`${response.status}: ${errorText}`);
      }
      
      return response;
    },
    onSuccess: async (response) => {
      const userData = await response.json();
      console.log("Login bem-sucedido:", userData);
      login(userData);
      setLocation("/");
      toast({
        title: "Login bem-sucedido",
        description: "Bem-vindo de volta ao CliqueChain!",
      });
    },
    onError: (error) => {
      console.error("Erro ao processar login:", error);
      toast({
        title: "Falha ao fazer login",
        description: `${error}`,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    loginMutation.mutate(data);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-600 text-white font-bold text-2xl">
              CC
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">CliqueChain</CardTitle>
          <CardDescription>
            Conecte. Construa. Marque história.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de usuário</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Seu nome de usuário" 
                        {...field} 
                        autoComplete="username"
                      />
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Sua senha" 
                        {...field} 
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center">
                    <i className="ri-loader-2-line animate-spin mr-2"></i>
                    Entrando...
                  </span>
                ) : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center">
          <div className="text-sm text-gray-500">
            Ainda não tem uma conta?{" "}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">
              Cadastre-se
            </Link>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 mt-2">
            Bem-vindo ao CliqueChain! Este aplicativo está funcionando com autenticação. 
            Para testar, cadastre uma nova conta ou use as credenciais de teste:<br/>
            <strong>Usuário:</strong> demo<br/>
            <strong>Senha:</strong> password123
          </div>
          
          <div className="text-xs text-gray-400 mt-2">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
