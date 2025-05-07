import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePersona } from "@/hooks/usePersona";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";

interface PersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PersonaModal = ({ isOpen, onClose }: PersonaModalProps) => {
  const { personas, activePersona, switchPersona, createPersona } = usePersona();

  const handlePersonaSwitch = (personaId: number) => {
    switchPersona(personaId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione uma Persona</DialogTitle>
          <DialogDescription>
            Cada persona representa uma versão diferente de você para diferentes contextos sociais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {personas.map(persona => (
            <div 
              key={persona.id}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                activePersona?.id === persona.id 
                  ? "bg-primary-50 border-2 border-primary-500" 
                  : "border border-gray-200 hover:border-primary-200 hover:bg-gray-50"
              }`}
              onClick={() => handlePersonaSwitch(persona.id)}
            >
              <div className="relative">
                <div className="w-12 h-12 overflow-hidden rounded-lg">
                  <Avatar className="w-12 h-12">
                    <AvatarImage 
                      src={persona.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${persona.name}`} 
                      alt={persona.name} 
                    />
                    <AvatarFallback>{getInitials(persona.name)}</AvatarFallback>
                  </Avatar>
                </div>
                {activePersona?.id === persona.id && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{persona.name}</h4>
                  {persona.isDefault && (
                    <span className="px-2 py-0.5 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">Padrão</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{persona.bio || "Sem descrição"}</p>
              </div>
            </div>
          ))}
          
          {/* Add New Persona Button */}
          <Button
            variant="outline"
            className="w-full p-3 mt-2 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-300 hover:bg-gray-50 flex items-center justify-center"
            onClick={() => {
              onClose();
              // Here you would typically open a form to create a new persona
              // For simplicity, we're just mocking it here
              createPersona({
                name: `Nova Persona ${personas.length + 1}`,
                bio: "Personalize essa persona",
                isDefault: false
              });
            }}
          >
            <i className="ri-add-line mr-2 text-primary-500"></i>
            <span className="font-medium text-primary-600">Criar Nova Persona</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaModal;
