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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Define the form schema
const formSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres").max(30, "Usuário deve ter no máximo 30 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  displayName: z.string().min(3, "Nome de exibição deve ter pelo menos 3 caracteres"),
  bio: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export default function Register() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      displayName: "",
      bio: ""
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", "/api/auth/register", data);
    },
    onSuccess: async (response) => {
      const userData = await response.json();
      
      // After successful registration, login
      try {
        const loginResponse = await apiRequest("POST", "/api/auth/login", {
          username: form.getValues("username"),
          password: form.getValues("password")
        });
        
        const loginData = await loginResponse.json();
        login(loginData);
        
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Bem-vindo ao CliqueChain!",
        });
        
        setLocation("/");
      } catch (error) {
        toast({
          title: "Cadastro realizado, mas falha ao fazer login",
          description: "Por favor, faça login manualmente.",
          variant: "default",
        });
        setLocation("/login");
      }
    },
    onError: (error) => {
      toast({
        title: "Falha ao cadastrar",
        description: `${error}`,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    // Generate random avatar based on username
    const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${data.username}`;
    registerMutation.mutate({
      ...data,
      avatarUrl
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary-600 text-white font-bold text-2xl">
              CC
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
          <CardDescription>
            Junte-se ao CliqueChain e comece a construir suas comunidades
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
                        placeholder="Escolha um nome de usuário único" 
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="Seu endereço de email" 
                        {...field} 
                        autoComplete="email"
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
                        placeholder="Crie uma senha segura" 
                        {...field} 
                        autoComplete="new-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome de exibição</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Como você quer ser chamado" 
                        {...field} 
                        autoComplete="name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio <span className="text-gray-400 text-xs">(opcional)</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Conte um pouco sobre você" 
                        {...field} 
                        className="resize-none"
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
                    Cadastrando...
                  </span>
                ) : "Criar conta"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 text-center">
          <div className="text-sm text-gray-500">
            Já tem uma conta?{" "}
            <Link href="/login">
              <a className="text-primary-600 hover:underline font-medium">
                Faça login
              </a>
            </Link>
          </div>
          
          <div className="text-xs text-gray-400">
            Ao se cadastrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
