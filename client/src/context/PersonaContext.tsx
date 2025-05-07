import { createContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Persona {
  id: number;
  userId: number;
  name: string;
  bio?: string;
  avatarUrl?: string;
  isDefault: boolean;
}

interface PersonaContextType {
  personas: Persona[];
  activePersona: Persona | null;
  switchPersona: (personaId: number) => void;
  createPersona: (personaData: Omit<Persona, "id" | "userId">) => void;
  updatePersona: (personaId: number, personaData: Partial<Persona>) => void;
  isLoading: boolean;
}

export const PersonaContext = createContext<PersonaContextType>({
  personas: [],
  activePersona: null,
  switchPersona: () => {},
  createPersona: () => {},
  updatePersona: () => {},
  isLoading: true,
});

interface PersonaProviderProps {
  children: ReactNode;
}

export const PersonaProvider = ({ children }: PersonaProviderProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  
  // Fetch personas from API
  const { data: personas = [], isLoading } = useQuery({
    queryKey: ['/api/personas'],
    enabled: !!user,
  });

  // Set active persona when personas are loaded or changed
  useEffect(() => {
    if (personas.length > 0 && !activePersona) {
      // Find default persona
      const defaultPersona = personas.find((p: Persona) => p.isDefault);
      
      if (defaultPersona) {
        setActivePersona(defaultPersona);
      } else {
        // If no default, use first persona
        setActivePersona(personas[0]);
      }
    }
  }, [personas, activePersona]);

  const createPersonaMutation = useMutation({
    mutationFn: async (personaData: Omit<Persona, "id" | "userId">) => {
      return apiRequest("POST", "/api/personas", personaData);
    },
    onSuccess: async (response) => {
      const newPersona = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/personas'] });
      
      toast({
        title: "Persona criada",
        description: `A persona ${newPersona.name} foi criada com sucesso!`,
      });
      
      // Switch to the new persona
      setActivePersona(newPersona);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar persona",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const updatePersonaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Persona> }) => {
      return apiRequest("PATCH", `/api/personas/${id}`, data);
    },
    onSuccess: async (response) => {
      const updatedPersona = await response.json();
      queryClient.invalidateQueries({ queryKey: ['/api/personas'] });
      
      toast({
        title: "Persona atualizada",
        description: `A persona ${updatedPersona.name} foi atualizada com sucesso!`,
      });
      
      // If updated persona is the active one, update active persona
      if (activePersona && activePersona.id === updatedPersona.id) {
        setActivePersona(updatedPersona);
      }
      
      // If the updated persona is now default, make it active
      if (updatedPersona.isDefault) {
        setActivePersona(updatedPersona);
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar persona",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const switchPersona = (personaId: number) => {
    const persona = personas.find((p: Persona) => p.id === personaId);
    if (persona) {
      setActivePersona(persona);
    }
  };

  const createPersona = (personaData: Omit<Persona, "id" | "userId">) => {
    createPersonaMutation.mutate(personaData);
  };

  const updatePersona = (personaId: number, personaData: Partial<Persona>) => {
    updatePersonaMutation.mutate({ id: personaId, data: personaData });
  };

  return (
    <PersonaContext.Provider
      value={{
        personas,
        activePersona,
        switchPersona,
        createPersona,
        updatePersona,
        isLoading,
      }}
    >
      {children}
    </PersonaContext.Provider>
  );
};
