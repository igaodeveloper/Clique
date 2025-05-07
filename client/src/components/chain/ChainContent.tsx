import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { useWebSocket } from "@/context/WebSocketContext";
import { formatTimeAgo, getInitials, getPersonaIndicatorColor } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import TypingIndicator from "./TypingIndicator";

interface ChainContentProps {
  chain: any;
  className?: string;
}

const ChainContent = ({ chain, className = "" }: ChainContentProps) => {
  const { user } = useAuth();
  const { activePersona } = usePersona();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingContent, setIsAddingContent] = useState(false);
  const { sendTypingStatus, joinClique } = useWebSocket();
  const [newContent, setNewContent] = useState("");
  const [contentType, setContentType] = useState<string>("text");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Join Clique WebSocket when component mounts
  useEffect(() => {
    if (chain && chain.cliqueId) {
      joinClique(chain.cliqueId);
    }
  }, [chain?.cliqueId, joinClique]);
  
  // Typing indicator with debounce
  useEffect(() => {
    if (!chain) return;
    
    // Don't send typing status if not adding content
    if (!isAddingContent) return;
    
    const typingTimeout = setTimeout(() => {
      // If was typing but stopped, update status
      if (isTyping && newContent.length === 0) {
        setIsTyping(false);
        sendTypingStatus(chain.id, false);
      }
      // If typing new content, update status
      else if (newContent.length > 0 && !isTyping) {
        setIsTyping(true);
        sendTypingStatus(chain.id, true);
      }
    }, 500);
    
    return () => clearTimeout(typingTimeout);
  }, [newContent, chain, isTyping, isAddingContent, sendTypingStatus]);
  
  // Clear typing status when unmounting or closing the form
  useEffect(() => {
    if (!isAddingContent && isTyping && chain) {
      setIsTyping(false);
      sendTypingStatus(chain.id, false);
    }
  }, [isAddingContent, chain, isTyping, sendTypingStatus]);

  if (!chain || !chain.contents?.length) return null;
  
  // Sort contents by position
  const sortedContents = [...chain.contents].sort((a, b) => a.position - b.position);
  const initialContent = sortedContents[0];
  const continuationContents = sortedContents.slice(1);
  
  // Check if the user has reacted to the initial content
  const hasUserReacted = initialContent.reactions?.some((reaction: any) => 
    reaction.userId === user?.id
  );
  
  // Get total reactions count
  const reactionsCount = initialContent.reactions?.length || 0;
  
  // Get comments count (continuation contents)
  const commentsCount = continuationContents.length;

  const addContentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/chains/${chain.id}/content`, {
        content: newContent,
        contentType,
        mediaUrl: mediaUrl || undefined,
        personaId: activePersona?.id
      });
    },
    onSuccess: () => {
      setNewContent("");
      setMediaUrl("");
      setContentType("text");
      setIsAddingContent(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      toast({
        title: "Conteúdo adicionado",
        description: "Sua contribuição foi adicionada à cadeia com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar conteúdo",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/content/${initialContent.id}/react`, {
        type: "like"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reagir",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/content/${initialContent.id}/react`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover reação",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const handleToggleReaction = () => {
    if (hasUserReacted) {
      removeReactionMutation.mutate();
    } else {
      addReactionMutation.mutate();
    }
  };

  const handleAddContent = () => {
    if (!newContent.trim() && !mediaUrl) {
      toast({
        title: "Campo obrigatório",
        description: "Adicione um conteúdo para continuar a cadeia",
        variant: "destructive",
      });
      return;
    }
    
    addContentMutation.mutate();
  };

  // Get user and persona from initial content
  const initialUser = initialContent.user;
  const initialPersona = initialContent.persona;
  
  // Determine persona indicator color 
  const personaIndicatorClass = initialPersona 
    ? getPersonaIndicatorColor(initialPersona.name.toLowerCase().includes('profissional') ? 'professional' : 'default')
    : 'bg-primary-500';

  return (
    <div className={`overflow-hidden bg-white rounded-xl shadow-sm ${className}`}>
      {/* Chain Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-10 h-10 overflow-hidden rounded-full">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={initialPersona?.avatarUrl || initialUser.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${initialUser.username}`} 
                    alt={initialUser.displayName || initialUser.username} 
                  />
                  <AvatarFallback>{getInitials(initialUser.displayName || initialUser.username)}</AvatarFallback>
                </Avatar>
              </div>
              {initialPersona && (
                <div className={`absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 text-xs text-white ${personaIndicatorClass} rounded-full`}>
                  <i className="ri-user-line"></i>
                </div>
              )}
            </div>
            <div className="ml-3">
              <div className="flex items-center">
                <h3 className="font-semibold">{initialUser.displayName || initialUser.username}</h3>
                {initialPersona && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-50 rounded-full">
                    {initialPersona.name}
                  </span>
                )}
              </div>
              <div className="flex items-center mt-0.5">
                <span className="text-xs text-gray-500">{formatTimeAgo(initialContent.createdAt)}</span>
                <span className="mx-1 text-gray-400">•</span>
                <div className="flex items-center text-xs text-gray-500">
                  <i className="ri-group-line mr-1"></i>
                  <span>{chain.cliqueName || "Clique"}</span>
                </div>
              </div>
            </div>
          </div>
          <button className="p-1 text-gray-400 rounded-full hover:bg-gray-100">
            <i className="ri-more-fill text-xl"></i>
          </button>
        </div>
      </div>
      
      {/* Chain Content */}
      <div className="p-4">
        {/* Initial Content */}
        <p className="mb-4">{initialContent.content}</p>
        
        {/* Media content if available */}
        {initialContent.mediaUrl && initialContent.contentType === 'image' && (
          <img 
            src={initialContent.mediaUrl} 
            alt="Conteúdo da cadeia" 
            className="object-cover w-full rounded-lg mb-4 h-60" 
          />
        )}
        
        {initialContent.mediaUrl && initialContent.contentType === 'video' && (
          <video 
            src={initialContent.mediaUrl} 
            controls 
            className="object-cover w-full rounded-lg mb-4 h-60"
          ></video>
        )}
        
        {initialContent.mediaUrl && initialContent.contentType === 'audio' && (
          <div className="flex items-center p-3 mb-4 bg-gray-100 rounded-lg">
            <button className="flex items-center justify-center w-10 h-10 mr-3 text-white bg-primary-500 rounded-full hover:bg-primary-600">
              <i className="ri-play-fill text-xl"></i>
            </button>
            <div className="flex-1">
              <div className="w-full h-2 mb-1 overflow-hidden bg-gray-300 rounded-full">
                <div className="w-1/3 h-full bg-primary-500"></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0:00</span>
                <span>3:45</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Chain Continuation Marker - only if there are continuation contents */}
        {continuationContents.length > 0 && (
          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="px-3 text-xs font-medium text-gray-500">CONTINUAÇÃO DA CADEIA</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
        )}
        
        {/* Chain Continuations */}
        {continuationContents.map((content: any, index: number) => (
          <div key={content.id} className="pl-4 mb-4 border-l-2 border-primary-200">
            <div className="flex items-center mb-2">
              <div className="w-8 h-8 overflow-hidden rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={content.persona?.avatarUrl || content.user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${content.user.username}`} 
                    alt={content.user.displayName || content.user.username}
                  />
                  <AvatarFallback>{getInitials(content.user.displayName || content.user.username)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-2">
                <h4 className="text-sm font-medium">{content.user.displayName || content.user.username}</h4>
                <span className="text-xs text-gray-500">{formatTimeAgo(content.createdAt)}</span>
              </div>
            </div>
            
            {content.content && (
              <p className="mb-3 text-sm">{content.content}</p>
            )}
            
            {/* Media content for continuations */}
            {content.mediaUrl && content.contentType === 'image' && (
              <img 
                src={content.mediaUrl} 
                alt="Conteúdo da cadeia" 
                className="mb-3 rounded-lg w-full h-auto max-h-60 object-cover" 
              />
            )}
            
            {content.mediaUrl && content.contentType === 'video' && (
              <video 
                src={content.mediaUrl} 
                controls 
                className="mb-3 rounded-lg w-full"
              ></video>
            )}
            
            {content.mediaUrl && content.contentType === 'audio' && (
              <div className="flex items-center p-3 mb-3 bg-gray-100 rounded-lg">
                <button className="flex items-center justify-center w-8 h-8 mr-2 text-white bg-primary-500 rounded-full hover:bg-primary-600">
                  <i className="ri-play-fill text-lg"></i>
                </button>
                <div className="flex-1">
                  <div className="w-full h-1.5 mb-1 overflow-hidden bg-gray-300 rounded-full">
                    <div className="w-1/4 h-full bg-primary-500"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0:00</span>
                    <span>2:15</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Add content form when user wants to continue the chain */}
        {isAddingContent && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <Textarea
              placeholder="Continue a cadeia..."
              className="w-full mb-3 min-h-24"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            
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
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setContentType('image');
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
                onClick={() => {
                  setContentType('video');
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
                onClick={() => {
                  setContentType('audio');
                  const audioUrl = prompt("Insira a URL do áudio");
                  if (audioUrl) setMediaUrl(audioUrl);
                }}
              >
                <i className="ri-mic-line mr-1 text-primary-500"></i>
                Áudio
              </Button>
              
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2"
                  onClick={() => {
                    setIsAddingContent(false);
                    setNewContent("");
                    setMediaUrl("");
                  }}
                >
                  Cancelar
                </Button>
                
                <Button
                  size="sm"
                  onClick={handleAddContent}
                  disabled={addContentMutation.isPending || (!newContent.trim() && !mediaUrl)}
                >
                  {addContentMutation.isPending ? (
                    <span className="flex items-center">
                      <i className="ri-loader-2-line animate-spin mr-1"></i> 
                      Enviando
                    </span>
                  ) : "Enviar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Chain Actions */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        {/* Typing indicator */}
        <TypingIndicator chainId={chain.id} className="mb-2" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              className={`flex items-center ${hasUserReacted ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
              onClick={handleToggleReaction}
              disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
            >
              <i className={`${hasUserReacted ? 'ri-heart-fill' : 'ri-heart-line'} text-xl`}></i>
              <span className="ml-1 text-sm font-medium">{reactionsCount}</span>
            </button>
            <button className="flex items-center text-gray-600 hover:text-primary-600">
              <i className="ri-chat-1-line text-xl"></i>
              <span className="ml-1 text-sm font-medium">{commentsCount}</span>
            </button>
          </div>
          
          <Button
            variant={isAddingContent ? "default" : "outline"}
            size="sm"
            className={isAddingContent ? "bg-primary-600" : "text-primary-600 bg-primary-50 hover:bg-primary-100"}
            onClick={() => setIsAddingContent(!isAddingContent)}
          >
            <i className={`${isAddingContent ? 'ri-close-line' : 'ri-add-line'} mr-1`}></i>
            {isAddingContent ? "Cancelar" : "Continuar Cadeia"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChainContent;
