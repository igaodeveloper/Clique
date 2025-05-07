import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import PersonaSwitcher from "../persona/PersonaSwitcher";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link, useLocation } from "wouter";
import { getInitials } from "@/lib/utils";

const Sidebar = () => {
  const { user } = useAuth();
  const { activePersona } = usePersona();
  const [location] = useLocation();

  if (!user) return null;
  
  return (
    <aside className="fixed bottom-0 left-0 right-0 z-30 hidden h-full w-72 bg-white shadow-lg md:block">
      <div className="flex flex-col h-full p-4">
        <div className="flex items-center mb-8">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-primary-600 text-white font-bold text-xl">
            CC
          </div>
          <h1 className="ml-3 text-2xl font-bold text-primary-600">CliqueChain</h1>
        </div>
        
        {/* Persona Switcher */}
        <PersonaSwitcher />
        
        {/* Main Navigation */}
        <nav className="flex-1 mb-6">
          <ul className="space-y-1">
            <li>
              <Link href="/">
                <a className={`flex items-center px-3 py-2.5 rounded-lg font-medium ${
                  location === "/" 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}>
                  <i className="ri-home-5-line text-xl mr-3"></i>
                  <span>Início</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/my-cliques">
                <a className={`flex items-center px-3 py-2.5 rounded-lg font-medium ${
                  location === "/my-cliques" 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}>
                  <i className="ri-group-line text-xl mr-3"></i>
                  <span>Meus Cliques</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/chains">
                <a className={`flex items-center px-3 py-2.5 rounded-lg font-medium ${
                  location === "/chains" 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}>
                  <i className="ri-links-line text-xl mr-3"></i>
                  <span>Chains</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/explore">
                <a className={`flex items-center px-3 py-2.5 rounded-lg font-medium ${
                  location === "/explore" 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}>
                  <i className="ri-search-line text-xl mr-3"></i>
                  <span>Explorar</span>
                </a>
              </Link>
            </li>
            <li>
              <Link href="/reputation">
                <a className={`flex items-center px-3 py-2.5 rounded-lg font-medium ${
                  location === "/reputation" 
                    ? "text-primary-600 bg-primary-50" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}>
                  <i className="ri-award-line text-xl mr-3"></i>
                  <span>Reputação</span>
                </a>
              </Link>
            </li>
          </ul>
        </nav>
        
        {/* User Profile Section */}
        <div className="pt-4 mt-auto border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${user.username}`} alt={user.displayName} />
                <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <h3 className="font-medium">{user.displayName}</h3>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500">Nível 3</span>
                  <div className="w-4 h-4 ml-1 text-yellow-500">
                    <i className="ri-star-fill"></i>
                  </div>
                </div>
              </div>
            </div>
            <Link href="/profile">
              <a className="p-2 text-gray-500 rounded-lg hover:bg-gray-100">
                <i className="ri-settings-3-line text-xl"></i>
              </a>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
