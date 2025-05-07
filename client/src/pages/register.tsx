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
  Check, 
  ChevronRight, 
  Smartphone, 
  UserCircle, 
  Mail, 
  Key,
  Users,
  Pencil,
  FileText,
  Image
} from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Stepper, Step, StepDescription, StepTitle } from "@/components/ui/stepper";

// Initial registration form schema
const accountFormSchema = z.object({
  username: z.string().min(3, "Usuário deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme sua senha")
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não correspondem",
  path: ["confirmPassword"],
});

// Profile form schema
const profileFormSchema = z.object({
  displayName: z.string().min(2, "Digite um nome de exibição"),
  bio: z.string().max(160, "A biografia deve ter no máximo 160 caracteres").optional(),
  avatarUrl: z.string().optional()
});

// First Clique form schema
const cliqueFormSchema = z.object({
  name: z.string().min(3, "O nome do Clique deve ter pelo menos 3 caracteres"),
  description: z.string().min(10, "Descreva o propósito do seu Clique").max(500, "A descrição deve ter no máximo 500 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  coverImageUrl: z.string().optional()
});

type AccountFormValues = z.infer<typeof accountFormSchema>;
type ProfileFormValues = z.infer<typeof profileFormSchema>;
type CliqueFormValues = z.infer<typeof cliqueFormSchema>;

export default function Register() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  // Initialize the account form
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  // Initialize the profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      avatarUrl: ""
    }
  });

  // Initialize the clique form
  const cliqueForm = useForm<CliqueFormValues>({
    resolver: zodResolver(cliqueFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      coverImageUrl: ""
    }
  });

  // Register user account mutation
  const registerAccountMutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      const { confirmPassword, ...accountData } = data;
      
      const response = await apiRequest("POST", "/api/auth/register", accountData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao registrar conta");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Conta criada com sucesso:", data);
      setUserData(data);
      setCurrentStep(1);
      
      // Pré-preencher o nome de exibição com o nome de usuário
      profileForm.setValue("displayName", data.username);
      
      toast({
        title: "Conta criada com sucesso",
        description: "Agora vamos configurar seu perfil",
      });
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao registrar conta",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // Simular criação de perfil - em produção, chamar API real
      console.log("Criando persona com dados:", {...data, userId: userData.id, isDefault: true});
      
      // Simulação para desenvolvimento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        id: 1,
        name: data.displayName,
        bio: data.bio,
        avatarUrl: data.avatarUrl || null,
        userId: userData.id,
        isDefault: true,
        createdAt: new Date().toISOString()
      };
    },
    onSuccess: (data) => {
      console.log("Perfil criado com sucesso:", data);
      setCurrentStep(2);
      toast({
        title: "Perfil criado com sucesso",
        description: "Agora vamos criar seu primeiro Clique",
      });
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao criar perfil",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  // Create first clique mutation
  const createCliqueMutation = useMutation({
    mutationFn: async (data: CliqueFormValues) => {
      // Simular criação de clique - em produção, chamar API real
      console.log("Criando clique com dados:", {...data, creatorId: userData.id});
      
      // Simulação para desenvolvimento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        id: 1,
        name: data.name,
        description: data.description,
        category: data.category,
        coverImageUrl: data.coverImageUrl || null,
        creatorId: userData.id,
        createdAt: new Date().toISOString()
      };
    },
    onSuccess: (data) => {
      console.log("Clique criado com sucesso:", data);
      
      // Fazer login completo e redirecionar para a home
      if (userData) {
        login(userData);
        setLocation("/");
        
        toast({
          title: "Seja bem-vindo ao CliqueChain!",
          description: "Sua conta foi criada com sucesso e seu primeiro Clique está pronto para uso.",
        });
      }
      setIsLoading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha ao criar Clique",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simular upload - em produção, enviar para um serviço de armazenamento
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        profileForm.setValue("avatarUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simular upload - em produção, enviar para um serviço de armazenamento
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCoverImagePreview(result);
        cliqueForm.setValue("coverImageUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onAccountSubmit = (data: AccountFormValues) => {
    setIsLoading(true);
    registerAccountMutation.mutate(data);
  };

  const onProfileSubmit = (data: ProfileFormValues) => {
    setIsLoading(true);
    updateProfileMutation.mutate(data);
  };

  const onCliqueSubmit = (data: CliqueFormValues) => {
    setIsLoading(true);
    createCliqueMutation.mutate(data);
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
          <h2 className="text-2xl font-semibold">Crie sua presença digital autêntica</h2>
          <p className="text-lg opacity-90">
            O CliqueChain redefine a forma como interagimos online, priorizando conexões significativas em pequenas comunidades.
          </p>
          
          <Stepper 
            orientation="vertical" 
            activeStep={currentStep}
            className="mt-8"
          >
            <Step>
              <StepTitle>Crie sua conta</StepTitle>
              <StepDescription>Informações básicas para seu acesso</StepDescription>
            </Step>
            <Step>
              <StepTitle>Configure seu perfil</StepTitle>
              <StepDescription>Personalize sua primeira Persona</StepDescription>
            </Step>
            <Step>
              <StepTitle>Crie seu primeiro Clique</StepTitle>
              <StepDescription>Inicie sua comunidade personalizada</StepDescription>
            </Step>
          </Stepper>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 flex items-center justify-center p-6 pb-16">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="md:hidden flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary text-white font-bold text-2xl">
                CC
              </div>
            </div>
            
            {currentStep === 0 && (
              <>
                <CardTitle className="text-2xl font-bold">Crie sua conta</CardTitle>
                <CardDescription>
                  Comece sua jornada no CliqueChain
                </CardDescription>
              </>
            )}
            
            {currentStep === 1 && (
              <>
                <CardTitle className="text-2xl font-bold">Configure seu perfil</CardTitle>
                <CardDescription>
                  Personalize sua primeira Persona
                </CardDescription>
              </>
            )}
            
            {currentStep === 2 && (
              <>
                <CardTitle className="text-2xl font-bold">Crie seu primeiro Clique</CardTitle>
                <CardDescription>
                  Inicie sua própria microcomunidade
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Step 1: Account Creation */}
            {currentStep === 0 && (
              <Form {...accountForm}>
                <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                  <FormField
                    control={accountForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de usuário</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserCircle className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input 
                              className="pl-10"
                              placeholder="Escolha um nome único" 
                              {...field} 
                              autoComplete="username"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={accountForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input 
                              className="pl-10"
                              type="email" 
                              placeholder="seu@email.com" 
                              {...field} 
                              autoComplete="email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={accountForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input 
                              className="pl-10"
                              type="password" 
                              placeholder="Crie uma senha segura" 
                              {...field} 
                              autoComplete="new-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={accountForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirme sua Senha</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Key className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input 
                              className="pl-10"
                              type="password" 
                              placeholder="Digite sua senha novamente" 
                              {...field} 
                              autoComplete="new-password"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                        Criando conta...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Próximo passo
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              </Form>
            )}
            
            {/* Step 2: Profile Setup */}
            {currentStep === 1 && (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24 border-4 border-background">
                        <AvatarImage src={avatarPreview || undefined} />
                        <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                          {userData?.username?.substring(0, 2).toUpperCase() || "CC"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <label 
                        htmlFor="avatar-upload" 
                        className="absolute bottom-0 right-0 p-1 rounded-full bg-primary text-white cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                        <input 
                          id="avatar-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <FormField
                    control={profileForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de exibição</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Como você quer ser chamado" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={profileForm.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biografia</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Conte um pouco sobre você..." 
                            {...field} 
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription className="text-right">
                          {field.value?.length || 0}/160
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1" 
                      onClick={() => setCurrentStep(0)}
                      disabled={isLoading}
                    >
                      Voltar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                          Salvando...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Próximo passo
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
            
            {/* Step 3: First Clique Creation */}
            {currentStep === 2 && (
              <Form {...cliqueForm}>
                <form onSubmit={cliqueForm.handleSubmit(onCliqueSubmit)} className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      {coverImagePreview ? (
                        <img 
                          src={coverImagePreview} 
                          alt="Capa do Clique" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Image className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      <label 
                        htmlFor="cover-upload" 
                        className="absolute bottom-2 right-2 p-1.5 rounded-full bg-primary text-white cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                        <input 
                          id="cover-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleCoverImageChange}
                        />
                      </label>
                    </div>
                  </div>
                  
                  <FormField
                    control={cliqueForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Clique</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input 
                              className="pl-10"
                              placeholder="Ex: Amigos da Faculdade" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={cliqueForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="">Selecione uma categoria</option>
                            <option value="amigos">Amigos</option>
                            <option value="familia">Família</option>
                            <option value="trabalho">Trabalho</option>
                            <option value="estudo">Estudo</option>
                            <option value="hobby">Hobby</option>
                            <option value="esporte">Esporte</option>
                            <option value="outro">Outro</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={cliqueForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Textarea 
                              placeholder="Descreva o propósito desta comunidade..." 
                              {...field} 
                              rows={4}
                              className="pl-10 pt-8"
                            />
                            <FileText className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormDescription className="text-right">
                          {field.value?.length || 0}/500
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="flex-1" 
                      onClick={() => setCurrentStep(1)}
                      disabled={isLoading}
                    >
                      Voltar
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
                          Criando...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Concluir
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 text-center">
            <div className="text-sm text-gray-500">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </div>
            
            <div className="text-xs text-gray-400 mt-2">
              Ao criar uma conta, você concorda com nossos Termos de Serviço e Política de Privacidade.
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
