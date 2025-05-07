import { useState } from "react";
import { usePersona } from "@/hooks/usePersona";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import PersonaModal from "./PersonaModal";

const PersonaSwitcher = () => {
  const { activePersona, personas } = usePersona();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  if (!activePersona || personas.length === 0) {
    return (
      <div className="p-3 mb-6 bg-gray-50 rounded-xl animate-pulse">
        <h2 className="mb-2 text-sm font-semibold text-gray-500">CARREGANDO PERSONA</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            <div className="ml-3">
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-3 w-24 bg-gray-200 rounded mt-1"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="p-3 mb-6 bg-gray-50 rounded-xl">
        <h2 className="mb-2 text-sm font-semibold text-gray-500">PERSONA ATUAL</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative">
              <div className="w-12 h-12 overflow-hidden bg-primary-100 rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage 
                    src={activePersona.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${activePersona.name}`} 
                    alt={activePersona.name} 
                  />
                  <AvatarFallback>{getInitials(activePersona.name)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="ml-3">
              <h3 className="font-medium">{activePersona.name}</h3>
              <p className="text-xs text-gray-500">{activePersona.bio || "Todos os Cliques"}</p>
            </div>
          </div>
          <button 
            className="p-2 text-gray-500 rounded-lg hover:bg-gray-200"
            onClick={() => setIsModalOpen(true)}
          >
            <i className="ri-arrow-down-s-line text-xl"></i>
          </button>
        </div>
      </div>
      
      <PersonaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default PersonaSwitcher;
