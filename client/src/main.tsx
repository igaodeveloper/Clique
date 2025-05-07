import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { PersonaProvider } from "./context/PersonaContext";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PersonaProvider>
        <App />
      </PersonaProvider>
    </AuthProvider>
  </QueryClientProvider>
);
