import { Link, useLocation } from "wouter";

const MobileNavigation = () => {
  const [location] = useLocation();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-5 px-2">
        <Link href="/">
          <a className={`flex flex-col items-center justify-center py-3 ${
            location === "/" ? "text-primary-600" : "text-gray-500"
          }`}>
            <i className="ri-home-5-line text-xl"></i>
            <span className="mt-1 text-xs">Início</span>
          </a>
        </Link>
        
        <Link href="/my-cliques">
          <a className={`flex flex-col items-center justify-center py-3 ${
            location === "/my-cliques" ? "text-primary-600" : "text-gray-500"
          }`}>
            <i className="ri-group-line text-xl"></i>
            <span className="mt-1 text-xs">Cliques</span>
          </a>
        </Link>
        
        <Link href="/create-chain">
          <a className="flex flex-col items-center justify-center py-3">
            <div className="flex items-center justify-center w-12 h-12 mb-1 text-white bg-primary-500 rounded-full">
              <i className="ri-add-line text-xl"></i>
            </div>
          </a>
        </Link>
        
        <Link href="/chains">
          <a className={`flex flex-col items-center justify-center py-3 ${
            location === "/chains" ? "text-primary-600" : "text-gray-500"
          }`}>
            <i className="ri-links-line text-xl"></i>
            <span className="mt-1 text-xs">Chains</span>
          </a>
        </Link>
        
        <Link href="/profile">
          <a className={`flex flex-col items-center justify-center py-3 ${
            location === "/profile" ? "text-primary-600" : "text-gray-500"
          }`}>
            <i className="ri-award-line text-xl"></i>
            <span className="mt-1 text-xs">Perfil</span>
          </a>
        </Link>
      </div>
    </nav>
  );
};

export default MobileNavigation;
