import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface CliqueFilterProps {
  selectedCliqueId: number | null;
  onCliqueChange: (cliqueId: number | null) => void;
}

const CliqueFilter = ({ selectedCliqueId, onCliqueChange }: CliqueFilterProps) => {
  const { data: cliques, isLoading } = useQuery({ 
    queryKey: ['/api/cliques'],
  });
  
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex items-center pb-2 mb-4 overflow-x-auto border-b border-gray-200 scrollbar-hide">
          <div className="w-32 h-10 bg-gray-200 rounded-full animate-pulse mr-2"></div>
          <div className="w-24 h-10 bg-gray-200 rounded-full animate-pulse mr-2"></div>
          <div className="w-28 h-10 bg-gray-200 rounded-full animate-pulse mr-2"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto mb-6">
      <div className="flex items-center pb-2 mb-4 overflow-x-auto border-b border-gray-200 scrollbar-hide">
        <Button
          variant={selectedCliqueId === null ? "default" : "outline"}
          className="px-4 py-2 mr-2 text-sm font-medium rounded-full whitespace-nowrap"
          onClick={() => onCliqueChange(null)}
        >
          Todos os Cliques
        </Button>
        
        {cliques?.map((clique: any) => (
          <Button
            key={clique.id}
            variant={selectedCliqueId === clique.id ? "default" : "outline"}
            className="px-4 py-2 mr-2 text-sm font-medium rounded-full whitespace-nowrap"
            onClick={() => onCliqueChange(clique.id)}
          >
            <i className={`${getCliqueIcon(clique.name)} mr-1`}></i> {clique.name}
          </Button>
        ))}
        
        <Button
          variant="outline"
          className="flex items-center justify-center w-8 h-8 text-gray-500 rounded-full whitespace-nowrap"
          onClick={() => window.location.href = "/create-clique"}
        >
          <i className="ri-add-line"></i>
        </Button>
      </div>
    </div>
  );
};

// Helper function to get an icon based on clique name
function getCliqueIcon(cliqueName: string): string {
  const name = cliqueName.toLowerCase();
  
  if (name.includes("família") || name.includes("familia")) {
    return "ri-parent-line";
  } else if (name.includes("dev") || name.includes("código") || name.includes("codigo")) {
    return "ri-code-box-line";
  } else if (name.includes("game") || name.includes("jogo")) {
    return "ri-gamepad-line";
  } else if (name.includes("filme") || name.includes("cinema")) {
    return "ri-film-line";
  } else if (name.includes("música") || name.includes("musica")) {
    return "ri-music-line";
  } else if (name.includes("viagem") || name.includes("trip")) {
    return "ri-compass-line";
  } else if (name.includes("comida") || name.includes("food")) {
    return "ri-restaurant-line";
  } else {
    return "ri-group-line";
  }
}

export default CliqueFilter;
