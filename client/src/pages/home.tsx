import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CliqueFilter from "@/components/clique/CliqueFilter";
import NewChainCreator from "@/components/chain/NewChainCreator";
import ChainContent from "@/components/chain/ChainContent";
import CliqueCard from "@/components/clique/CliqueCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const Home = () => {
  const { user } = useAuth();
  const [selectedCliqueId, setSelectedCliqueId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'highlights' | 'recent'>('highlights');

  // Fetch user feed
  const { data: feed, isLoading: isFeedLoading } = useQuery({
    queryKey: ['/api/feed'],
  });

  // Fetch suggested cliques
  const { data: suggestedCliques, isLoading: isCliquesLoading } = useQuery({
    queryKey: ['/api/cliques/suggested'],
  });

  // Filter feed based on selected clique
  const filteredFeed = selectedCliqueId
    ? feed?.filter((chain: any) => chain.cliqueId === selectedCliqueId)
    : feed;

  // Sort feed based on view mode
  const sortedFeed = filteredFeed
    ? [...filteredFeed].sort((a, b) => {
        if (viewMode === 'recent') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        } else {
          // For 'highlights' mode, prioritize chains with more content and reactions
          const aEngagement = (a.contents?.length || 0) + a.contents?.reduce((sum: number, content: any) => sum + (content.reactions?.length || 0), 0);
          const bEngagement = (b.contents?.length || 0) + b.contents?.reduce((sum: number, content: any) => sum + (content.reactions?.length || 0), 0);
          return bEngagement - aEngagement;
        }
      })
    : [];

  return (
    <div>
      {/* Content Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Seu Feed</h2>
          
          {/* Switch View Controls */}
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <Button
              variant={viewMode === 'highlights' ? "default" : "ghost"}
              size="sm"
              className={viewMode === 'highlights' ? "" : "text-gray-600"}
              onClick={() => setViewMode('highlights')}
            >
              Destaques
            </Button>
            <Button
              variant={viewMode === 'recent' ? "default" : "ghost"}
              size="sm"
              className={viewMode === 'recent' ? "" : "text-gray-600"}
              onClick={() => setViewMode('recent')}
            >
              Mais recentes
            </Button>
          </div>
        </div>
      </div>
      
      {/* Clique Filter Component */}
      <CliqueFilter 
        selectedCliqueId={selectedCliqueId} 
        onCliqueChange={setSelectedCliqueId} 
      />
      
      {/* Content Feed */}
      <div className="max-w-3xl mx-auto space-y-6">
        {/* New Chain Creation Card */}
        <NewChainCreator />
        
        {/* Feed Content */}
        {isFeedLoading ? (
          // Loading skeletons
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="overflow-hidden bg-white rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-3 space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-40 w-full rounded-lg mb-4" />
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between">
                  <div className="flex space-x-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
            </div>
          ))
        ) : sortedFeed?.length > 0 ? (
          sortedFeed.map((chain: any) => (
            <ChainContent key={chain.id} chain={chain} />
          ))
        ) : (
          <div className="p-8 text-center bg-white rounded-xl shadow-sm">
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma cadeia encontrada</h3>
            <p className="text-gray-500 mb-4">
              {selectedCliqueId 
                ? "Não há nenhuma cadeia neste clique ainda. Que tal criar a primeira?" 
                : "Seu feed está vazio. Participe de mais cliques para ver conteúdo."}
            </p>
            {selectedCliqueId && (
              <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Criar nova cadeia
              </Button>
            )}
          </div>
        )}
        
        {/* Suggested Cliques Section */}
        {suggestedCliques?.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-4 text-lg font-bold text-gray-800">Cliques Sugeridos</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isCliquesLoading ? (
                // Loading skeletons for cliques
                Array(2).fill(0).map((_, i) => (
                  <div key={i} className="overflow-hidden bg-white rounded-xl shadow-sm">
                    <Skeleton className="h-40 w-full" />
                    <div className="p-4">
                      <Skeleton className="h-6 w-1/2 mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-3" />
                      <div className="flex justify-between items-center">
                        <div className="flex -space-x-2">
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                          <Skeleton className="h-7 w-7 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                suggestedCliques.slice(0, 2).map((clique: any) => (
                  <CliqueCard key={clique.id} clique={clique} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
