import { useState } from "react";
import { useLocation } from "wouter";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(50, "Nome deve ter no máximo 50 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Selecione uma categoria"),
  coverImageUrl: z.string().optional(),
  isPrivate: z.boolean().default(false)
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateClique() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      coverImageUrl: "",
      isPrivate: false
    }
  });

  // Categories for selection
  const categories = [
    { value: "tecnologia", label: "Tecnologia" },
    { value: "lazer", label: "Lazer" },
    { value: "educacao", label: "Educação" },
    { value: "familia", label: "Família" },
    { value: "trabalho", label: "Trabalho" },
    { value: "esportes", label: "Esportes" },
    { value: "arte", label: "Arte e Cultura" },
    { value: "games", label: "Games" }
  ];

  // Create clique mutation
  const createCliqueMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return apiRequest("POST", "/api/cliques", data);
    },
    onSuccess: async (response) => {
      const cliqueData = await response.json();
      toast({
        title: "Clique criado com sucesso!",
        description: `O Clique "${cliqueData.name}" foi criado.`,
      });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar Clique",
        description: `${error}`,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    createCliqueMutation.mutate(data);
  };

  return (
    <div className="container max-w-2xl py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Criar novo Clique</CardTitle>
          <CardDescription>
            Crie um grupo íntimo para compartilhar conteúdo colaborativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Clique</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Devs BR, Família Silva, Turma do Colégio..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Escolha um nome único e descritivo para seu Clique
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição <span className="text-gray-400 text-xs">(opcional)</span></FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o propósito deste Clique e quem deve participar" 
                        {...field} 
                        className="resize-none" 
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Uma boa descrição ajuda os membros a entenderem o objetivo do Clique
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      A categoria ajuda a organizar e descobrir Cliques semelhantes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="coverImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem de Capa <span className="text-gray-400 text-xs">(opcional)</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/imagem.jpg" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      URL de uma imagem para identificar visualmente seu Clique
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Clique Privado</FormLabel>
                      <FormDescription>
                        Se ativado, o Clique só será visível para membros convidados
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center">
                      <i className="ri-loader-2-line animate-spin mr-2"></i>
                      Criando...
                    </span>
                  ) : "Criar Clique"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
