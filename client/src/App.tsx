import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "next-themes";

// Layout Components
import MobileHeader from "./components/layout/MobileHeader";
import Sidebar from "./components/layout/Sidebar";
import MobileNavigation from "./components/layout/MobileNavigation";

// Pages
import Home from "./pages/home";
import Login from "./pages/login";
import Register from "./pages/register";
import Profile from "./pages/profile";
import CreateClique from "./pages/create-clique";
import NotFound from "./pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
    </div>;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="*">
          <Login />
        </Route>
      </Switch>
    );
  }

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      <MobileHeader />
      <Sidebar />
      
      <main className="flex-1 px-4 pt-16 pb-20 md:pl-72 md:pt-6 md:pb-6">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/profile" component={Profile} />
          <Route path="/create-clique" component={CreateClique} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <MobileNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
