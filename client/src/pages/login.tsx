import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { FaGoogle } from "react-icons/fa";
import { Separator } from "@/components/ui/separator";
import { Mail, Smartphone } from "lucide-react";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Define the form schema for email login
const emailFormSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres")
});

// Define the form schema for phone login
const phoneFormSchema = z.object({
  phone: z.string().min(10, "Digite um número de telefone válido"),
  code: z.string().min(6, "O código deve ter 6 dígitos").max(6).optional()
});

type EmailFormValues = z.infer<typeof emailFormSchema>;
type PhoneFormValues = z.infer<typeof phoneFormSchema>;

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");

  // Initialize the email form
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  // Initialize the phone form
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: "",
      code: ""
    }
  });

  // Login with email mutation
  const emailLoginMutation = useMutation({
    mutationFn: async (data: EmailFormValues) => {
      console.log("Tentando fazer login com:", data.username);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro de login:", response.status, errorData);
          throw new Error(errorData.message || `Erro ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Erro de conexão:", error);
        throw error;
      }
    },
    onSuccess: (userData) => {
      console.log("Login bem-sucedido:", userData);
      login(userData);
      setLocation("/");
      toast({
        title: "Login bem-sucedido",
        description: "Bem-vindo de volta ao CliqueChain!",
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao processar login:", error);
      toast({
        title: "Falha ao fazer login",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  // Request phone code mutation (simulated)
  const requestPhoneCodeMutation = useMutation({
    mutationFn: async (phone: string) => {
      // Simulação - em produção, isso chamaria um endpoint real
      console.log("Solicitando código para:", phone);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: () => {
      setShowPhoneVerification(true);
      toast({
        title: "Código enviado",
        description: "Um código de verificação foi enviado para seu telefone.",
      });
    },
    onError: () => {
      toast({
        title: "Falha ao enviar código",
        description: "Não foi possível enviar o código de verificação.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  // Verify phone code mutation (simulated)
  const verifyPhoneCodeMutation = useMutation({
    mutationFn: async (data: PhoneFormValues) => {
      // Simulação - em produção, isso chamaria um endpoint real
      console.log("Verificando código para:", data.phone, data.code);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simular um usuário retornado ao verificar o código
      return {
        id: 999,
        username: "usuario_telefone",
        email: `${data.phone}@telefone.auth`,
        displayName: "Usuário Telefone",
        bio: "Autenticado via telefone",
        avatarUrl: null,
        createdAt: new Date().toISOString()
      };
    },
    onSuccess: (userData) => {
      console.log("Login por telefone bem-sucedido:", userData);
      login(userData);
      setLocation("/");
      toast({
        title: "Login bem-sucedido",
        description: "Bem-vindo de volta ao CliqueChain!",
      });
    },
    onError: () => {
      toast({
        title: "Código inválido",
        description: "O código informado não é válido.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  // Login with Google (simulated)
  const handleGoogleLogin = () => {
    toast({
      title: "Login com Google",
      description: "Função ainda não implementada. Use login com e-mail.",
    });
  };

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    emailLoginMutation.mutate(data);
  };

  const onPhoneSubmit = async (data: PhoneFormValues) => {
    setIsLoading(true);
    if (!showPhoneVerification) {
      requestPhoneCodeMutation.mutate(data.phone);
      setIsLoading(false);
    } else {
      verifyPhoneCodeMutation.mutate(data);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Hero section */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary to-secondary p-8 text-white justify-center items-center">
        <div className="max-w-md space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white text-primary font-bold text-xl">
              CC
            </div>
            <h1 className="text-3xl font-bold">CliqueChain</h1>
          </div>
          <h2 className="text-2xl font-semibold">Conexões profundas em microcomunidades</h2>
          <p className="text-lg opacity-90">
            Crie, colabore e conecte-se em grupos íntimos com conteúdo que realmente importa.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">1</div>
              <p>Crie Cliques para suas comunidades de interesse</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">2</div>
              <p>Colabore em Chains - conversas encadeadas e focadas</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">3</div>
              <p>Personalize sua identidade com Personas contextuais</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="md:hidden flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary text-white font-bold text-2xl">
                CC
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
            <CardDescription>
              Entre para continuar construindo conexões significativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Social login buttons */}
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2" 
              onClick={handleGoogleLogin}
              type="button"
            >
              <FaGoogle className="text-red-500" />
              <span>Continuar com Google</span>
            </Button>

            <div className="relative flex items-center justify-center my-6">
              <Separator className="absolute w-full" />
              <span className="relative bg-background px-2 text-xs text-muted-foreground">
                ou continue com
              </span>
            </div>

            <Tabs defaultValue="email" className="w-full" onValueChange={(value) => setLoginMethod(value as "email" | "phone")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>E-mail</span>
                </TabsTrigger>
                <TabsTrigger value="phone" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Telefone</span>
                </TabsTrigger>
              </TabsList>

              {/* Email login form */}
              <TabsContent value="email" className="space-y-4">
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                    <FormField
                      control={emailForm.control}
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
                      control={emailForm.control}
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
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                          Entrando...
                        </span>
                      ) : "Entrar"}
                    </Button>
                  </form>
                </Form>

                <div className="text-center">
                  <Link href="#" className="text-sm text-primary hover:underline">
                    Esqueceu sua senha?
                  </Link>
                </div>
              </TabsContent>

              {/* Phone login form */}
              <TabsContent value="phone" className="space-y-4">
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                    <FormField
                      control={phoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de telefone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+55 (00) 00000-0000" 
                              {...field} 
                              disabled={showPhoneVerification}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {showPhoneVerification && (
                      <FormField
                        control={phoneForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código de verificação</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000000" 
                                {...field} 
                                maxLength={6}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                          {showPhoneVerification ? "Verificando..." : "Enviando..."}
                        </span>
                      ) : (
                        showPhoneVerification ? "Verificar código" : "Enviar código"
                      )}
                    </Button>

                    {showPhoneVerification && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full text-sm"
                        onClick={() => setShowPhoneVerification(false)}
                      >
                        Usar outro número
                      </Button>
                    )}
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center">
            <div className="text-sm text-gray-500">
              Ainda não tem uma conta?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Cadastre-se
              </Link>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md text-sm text-blue-700 dark:text-blue-300 mt-2">
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
    </div>
  );
}
