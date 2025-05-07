import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { usePersona } from "@/hooks/usePersona";
import { useState } from "react";
import { Drawer } from "vaul";
import PersonaSwitcher from "../persona/PersonaSwitcher";

const MobileHeader = () => {
  const { user } = useAuth();
  const { activePersona } = usePersona();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  if (!user) return null;
  
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-600 text-white font-bold text-lg">
            CC
          </div>
          <h1 className="ml-2 text-xl font-bold text-primary-600">CliqueChain</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="p-2 text-gray-600 rounded-full hover:bg-gray-100"
            onClick={() => setNotificationsOpen(true)}
          >
            <i className="ri-notification-3-line text-xl"></i>
          </button>
          
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <button className="flex items-center justify-center w-8 h-8 overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500">
                <Avatar className="w-8 h-8">
                  <AvatarImage 
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.username}`} 
                    alt={user.displayName} 
                  />
                  <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                </Avatar>
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/40" />
              <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[90%] mt-24 fixed bottom-0 left-0 right-0">
                <div className="p-4 bg-white rounded-t-[10px] flex-1 overflow-auto">
                  <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8" />
                  
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Sua Persona</h3>
                    <PersonaSwitcher />
                  </div>
                  
                  <div className="space-y-2">
                    <a href="/profile" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
                      <i className="ri-user-line text-xl mr-3 text-gray-500"></i>
                      <span>Perfil</span>
                    </a>
                    
                    <a href="/my-cliques" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
                      <i className="ri-group-line text-xl mr-3 text-gray-500"></i>
                      <span>Meus Cliques</span>
                    </a>
                    
                    <a href="/reputation" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
                      <i className="ri-award-line text-xl mr-3 text-gray-500"></i>
                      <span>Minha Reputação</span>
                    </a>
                    
                    <a href="/settings" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
                      <i className="ri-settings-3-line text-xl mr-3 text-gray-500"></i>
                      <span>Configurações</span>
                    </a>
                    
                    <a href="/api/auth/logout" className="flex items-center p-3 rounded-lg hover:bg-gray-100">
                      <i className="ri-logout-box-line text-xl mr-3 text-gray-500"></i>
                      <span>Sair</span>
                    </a>
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
      
      {/* Notifications Drawer */}
      <Drawer.Root open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-[10px] h-[80%] mt-24 fixed bottom-0 left-0 right-0">
            <div className="p-4 bg-white rounded-t-[10px] flex-1 overflow-auto">
              <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-4" />
              
              <h3 className="text-lg font-semibold mb-4">Notificações</h3>
              
              <div className="space-y-4">
                <div className="flex items-start p-3 bg-primary-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0 mr-3">
                    <i className="ri-links-line text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm"><strong>Rafael Silva</strong> continuou sua cadeia sobre design de formulários</p>
                    <p className="text-xs text-gray-500 mt-1">10 minutos atrás</p>
                  </div>
                </div>
                
                <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0 mr-3">
                    <i className="ri-group-line text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm"><strong>Web Developers Brasil</strong> tem 3 novas cadeias de conteúdo</p>
                    <p className="text-xs text-gray-500 mt-1">2 horas atrás</p>
                  </div>
                </div>
                
                <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0 mr-3">
                    <i className="ri-heart-line text-xl"></i>
                  </div>
                  <div>
                    <p className="text-sm"><strong>Ana Oliveira</strong> e 4 outros curtiram sua cadeia</p>
                    <p className="text-xs text-gray-500 mt-1">5 horas atrás</p>
                  </div>
                </div>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </header>
  );
};

export default MobileHeader;
