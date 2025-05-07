import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { personas } = usePersona();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [email, setEmail] = useState(user?.email || "");
  
  // Get user's reputations/badges
  const { data: reputations, isLoading: isReputationLoading } = useQuery({
    queryKey: ['/api/reputations'],
  });

  // Get user's cliques
  const { data: cliques, isLoading: isCliquesLoading } = useQuery({
    queryKey: ['/api/cliques'],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/users/${user?.id}`, {
        displayName,
        bio,
        email
      });
    },
    onSuccess: async (response) => {
      const updatedUser = await response.json();
      updateUser(updatedUser);
      setIsEditing(false);
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: `${error}`,
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate();
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      logout();
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: `${error}`,
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="container max-w-4xl py-6">
      <div className="grid gap-6">
        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage 
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.username}`} 
                  alt={user.displayName} 
                />
                <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome de exibição</label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="max-w-md resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdateProfile} disabled={updateProfileMutation.isPending}>
                        {updateProfileMutation.isPending ? "Salvando..." : "Salvar alterações"}
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center sm:justify-between mb-4 flex-wrap gap-2">
                      <h2 className="text-2xl font-bold">{user.displayName}</h2>
                      <Button variant="outline" onClick={() => setIsEditing(true)}>
                        <i className="ri-edit-line mr-1"></i> Editar perfil
                      </Button>
                    </div>
                    <p className="text-gray-600 mb-3">@{user.username}</p>
                    {user.bio && <p className="text-gray-700 mb-4">{user.bio}</p>}
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center text-gray-500">
                        <i className="ri-group-line mr-1"></i>
                        <span>{cliques?.length || 0} Cliques</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <i className="ri-award-line mr-1"></i>
                        <span>{reputations?.length || 0} Conquistas</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <i className="ri-user-settings-line mr-1"></i>
                        <span>{personas?.length || 0} Personas</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="personas" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="personas">Personas</TabsTrigger>
            <TabsTrigger value="badges">Conquistas</TabsTrigger>
            <TabsTrigger value="cliques">Meus Cliques</TabsTrigger>
          </TabsList>
          
          {/* Personas Tab */}
          <TabsContent value="personas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suas Personas</CardTitle>
                <CardDescription>
                  Gerencie suas diferentes identidades para contextos sociais distintos
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {personas?.map((persona) => (
                  <div key={persona.id} className="flex items-center p-3 border rounded-lg">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage 
                          src={persona.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${persona.name}`} 
                          alt={persona.name} 
                        />
                        <AvatarFallback>{getInitials(persona.name)}</AvatarFallback>
                      </Avatar>
                      {persona.isDefault && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium">{persona.name}</h4>
                        {persona.isDefault && (
                          <Badge variant="outline" className="ml-2 bg-primary-50 text-primary-700">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{persona.bio || "Sem descrição"}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <i className="ri-edit-line"></i>
                    </Button>
                  </div>
                ))}
                
                <Button variant="outline" className="mt-2">
                  <i className="ri-add-line mr-1"></i>
                  Criar Nova Persona
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suas Conquistas</CardTitle>
                <CardDescription>
                  Conquistas e reputação que você ganhou em suas interações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isReputationLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-500">Carregando conquistas...</p>
                  </div>
                ) : reputations?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reputations.map((badge: any) => (
                      <div key={badge.id} className="flex items-center p-3 border rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                          <i className={getBadgeIcon(badge.badgeType)}></i>
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium">{badge.badgeName}</h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <span>Nível {badge.level}</span>
                            {badge.cliqueId && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{getCliqueName(badge.cliqueId, cliques)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-2">🏆</div>
                    <h3 className="text-lg font-semibold mb-1">Sem conquistas ainda</h3>
                    <p className="text-gray-500">
                      Comece a participar de Cliques e contribuir com Chains para ganhar conquistas!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Cliques Tab */}
          <TabsContent value="cliques" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seus Cliques</CardTitle>
                <CardDescription>
                  Comunidades das quais você faz parte
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCliquesLoading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-2"></div>
                    <p className="text-gray-500">Carregando cliques...</p>
                  </div>
                ) : cliques?.length > 0 ? (
                  <div className="grid gap-4">
                    {cliques.map((clique: any) => (
                      <div key={clique.id} className="flex items-center p-3 border rounded-lg">
                        <div className="w-12 h-12 overflow-hidden rounded-lg flex-shrink-0">
                          {clique.coverImageUrl ? (
                            <img 
                              src={clique.coverImageUrl} 
                              alt={clique.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-600">
                              <i className="ri-group-line text-xl"></i>
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <h4 className="font-medium">{clique.name}</h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <span>
                              {clique.memberCount} {clique.memberCount === 1 ? "membro" : "membros"}
                            </span>
                            {clique.category && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{clique.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/cliques/${clique.id}`}>
                            <i className="ri-arrow-right-line"></i>
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="text-4xl mb-2">👥</div>
                    <h3 className="text-lg font-semibold mb-1">Nenhum Clique ainda</h3>
                    <p className="text-gray-500 mb-4">
                      Você ainda não participa de nenhum Clique. Crie um novo ou participe de Cliques existentes!
                    </p>
                    <Button asChild>
                      <a href="/create-clique">
                        <i className="ri-add-line mr-1"></i>
                        Criar Clique
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Logout Button */}
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={handleLogout}>
            <i className="ri-logout-box-line mr-1"></i>
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getBadgeIcon(badgeType: string): string {
  switch (badgeType) {
    case 'contribution':
      return 'ri-links-line';
    case 'engagement':
      return 'ri-heart-line';
    case 'creation':
      return 'ri-add-circle-line';
    case 'social':
      return 'ri-team-line';
    default:
      return 'ri-award-line';
  }
}

function getCliqueName(cliqueId: number, cliques: any[] | undefined): string {
  if (!cliques) return 'Clique';
  const clique = cliques.find(c => c.id === cliqueId);
  return clique ? clique.name : 'Clique';
}
