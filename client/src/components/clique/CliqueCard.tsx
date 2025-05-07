import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials, getCategoryColor } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CliqueCardProps {
  clique: {
    id: number;
    name: string;
    description: string;
    coverImageUrl: string;
    category: string;
    memberCount: number;
    members: Array<{
      id: number;
      username: string;
      avatarUrl: string;
    }>;
  };
}

const CliqueCard = ({ clique }: CliqueCardProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const joinCliqueMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/cliques/${clique.id}/join`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cliques'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cliques/suggested'] });
      toast({
        title: "Sucesso!",
        description: `Você agora é membro do Clique ${clique.name}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao participar do Clique",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });
  
  const handleJoin = () => {
    joinCliqueMutation.mutate();
  };
  
  const categoryColorClass = getCategoryColor(clique.category);
  
  return (
    <div className="relative overflow-hidden transition-all bg-white rounded-xl shadow-sm clique-card hover:shadow-md">
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-800/60 to-transparent">
        <div className="flex items-center justify-between p-3">
          <span className={`px-2 py-1 text-xs font-medium text-white ${categoryColorClass} rounded-full`}>
            {clique.category || "Grupo"}
          </span>
          <span className="px-2 py-1 text-xs font-medium text-white bg-gray-700/70 rounded-full">
            {clique.memberCount} membros
          </span>
        </div>
      </div>
      
      {clique.coverImageUrl ? (
        <img 
          src={clique.coverImageUrl} 
          alt={`Capa do grupo ${clique.name}`} 
          className="object-cover w-full h-40"
        />
      ) : (
        <div className="w-full h-40 bg-gradient-to-r from-primary-100 to-primary-200 flex items-center justify-center">
          <span className="text-primary-700 text-2xl font-bold">{clique.name}</span>
        </div>
      )}
      
      <div className="p-4">
        <h4 className="mb-1 text-lg font-semibold">{clique.name}</h4>
        <p className="mb-3 text-sm text-gray-600 line-clamp-2">
          {clique.description || "Sem descrição disponível."}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {clique.members.map((member, index) => (
              <div key={member.id} className="w-7 h-7 overflow-hidden border-2 border-white rounded-full">
                <Avatar className="w-7 h-7">
                  <AvatarImage 
                    src={member.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${member.username}`} 
                    alt={`Membro ${member.username}`} 
                  />
                  <AvatarFallback>{getInitials(member.username)}</AvatarFallback>
                </Avatar>
              </div>
            ))}
            
            {clique.memberCount > clique.members.length && (
              <div className="flex items-center justify-center w-7 h-7 text-xs font-medium text-gray-700 bg-gray-200 border-2 border-white rounded-full">
                +{clique.memberCount - clique.members.length}
              </div>
            )}
          </div>
          
          <Button
            variant="outline"
            className="px-3 py-1 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
            onClick={handleJoin}
            disabled={joinCliqueMutation.isPending}
          >
            {joinCliqueMutation.isPending ? (
              <span className="flex items-center">
                <i className="ri-loader-2-line animate-spin mr-1"></i> 
                Processando
              </span>
            ) : "Participar"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CliqueCard;
