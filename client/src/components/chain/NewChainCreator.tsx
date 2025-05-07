import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { getInitials } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NewChainCreatorProps {
  className?: string;
}

const NewChainCreator = ({ className }: NewChainCreatorProps) => {
  const { user } = useAuth();
  const { activePersona } = usePersona();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [content, setContent] = useState("");
  const [selectedCliqueId, setSelectedCliqueId] = useState<string>("");
  const [contentType, setContentType] = useState<string>("text");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  
  const { data: cliques, isLoading: isLoadingCliques } = useQuery({ 
    queryKey: ['/api/cliques'],
  });
  
  const createChainMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/chains", {
        cliqueId: parseInt(selectedCliqueId),
        personaId: activePersona?.id,
        title: content.split(' ').slice(0, 5).join(' '),
        initialContent: {
          content,
          contentType,
          mediaUrl: mediaUrl || undefined
        }
      });
    },
    onSuccess: () => {
      setContent("");
      setMediaUrl("");
      setContentType("text");
      
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      toast({
        title: "Cadeia criada com sucesso!",
        description: "Seu conteúdo foi compartilhado com o clique.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cadeia",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateChain = () => {
    if (!content.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Adicione um conteúdo para iniciar a cadeia",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedCliqueId) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um clique para compartilhar",
        variant: "destructive",
      });
      return;
    }
    
    createChainMutation.mutate();
  };
  
  if (!user || !activePersona) return null;
  
  return (
    <div className={`overflow-hidden bg-white rounded-xl shadow-sm ${className}`}>
      <div className="p-4">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 overflow-hidden rounded-full">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={activePersona.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${activePersona.name}`} 
                alt={activePersona.name} 
              />
              <AvatarFallback>{getInitials(activePersona.name)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 ml-3">
            <Input
              type="text"
              placeholder="Inicie uma nova cadeia de conteúdo..."
              className="w-full px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        
        {mediaUrl && contentType === 'image' && (
          <div className="mb-3 relative">
            <img 
              src={mediaUrl} 
              alt="Prévia da imagem" 
              className="w-full h-40 object-cover rounded-lg" 
            />
            <button 
              className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full"
              onClick={() => setMediaUrl("")}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}
        
        {mediaUrl && contentType === 'video' && (
          <div className="mb-3 relative">
            <video 
              src={mediaUrl} 
              controls 
              className="w-full h-40 object-cover rounded-lg"
            ></video>
            <button 
              className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full"
              onClick={() => setMediaUrl("")}
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}
        
        {mediaUrl && contentType === 'audio' && (
          <div className="mb-3 p-3 bg-gray-100 rounded-lg">
            <audio src={mediaUrl} controls className="w-full"></audio>
            <button 
              className="mt-2 text-gray-500 hover:text-gray-700"
              onClick={() => setMediaUrl("")}
            >
              <i className="ri-close-line mr-1"></i>
              Remover áudio
            </button>
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => {
              setContentType('image');
              // In a real app, we would open a file picker or URL input
              // For demo, we'll use a placeholder URL
              const imageUrl = prompt("Insira a URL da imagem");
              if (imageUrl) setMediaUrl(imageUrl);
            }}
          >
            <i className="ri-image-line mr-1 text-primary-500"></i>
            Imagem
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => {
              setContentType('video');
              // In a real app, we would open a file picker or URL input
              const videoUrl = prompt("Insira a URL do vídeo");
              if (videoUrl) setMediaUrl(videoUrl);
            }}
          >
            <i className="ri-vidicon-line mr-1 text-primary-500"></i>
            Vídeo
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            onClick={() => {
              setContentType('audio');
              // In a real app, we would open a file picker or URL input
              const audioUrl = prompt("Insira a URL do áudio");
              if (audioUrl) setMediaUrl(audioUrl);
            }}
          >
            <i className="ri-mic-line mr-1 text-primary-500"></i>
            Áudio
          </Button>
          
          <div className="flex items-center ml-auto">
            <Select
              value={selectedCliqueId}
              onValueChange={setSelectedCliqueId}
            >
              <SelectTrigger className="px-3 py-2 text-sm bg-gray-100 rounded-lg w-[200px]">
                <SelectValue placeholder="Compartilhar em..." />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCliques ? (
                  <SelectItem value="loading" disabled>Carregando cliques...</SelectItem>
                ) : cliques?.length > 0 ? (
                  cliques.map((clique: any) => (
                    <SelectItem key={clique.id} value={clique.id.toString()}>
                      Compartilhar em: {clique.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>Nenhum clique encontrado</SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Button
              className="ml-2"
              size="sm"
              onClick={handleCreateChain}
              disabled={createChainMutation.isPending || !content.trim() || !selectedCliqueId}
            >
              {createChainMutation.isPending ? (
                <span className="flex items-center">
                  <i className="ri-loader-2-line animate-spin mr-1"></i> 
                  Publicando
                </span>
              ) : "Publicar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChainCreator;
