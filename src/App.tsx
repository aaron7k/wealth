import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { PrivacyProvider } from "./contexts/PrivacyContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Budgets from "./pages/Budgets";
import Subscriptions from "./pages/Subscriptions";
import Categories from "./pages/Categories";
import Diezmos from "./pages/Diezmos";
import Metrics from "./pages/Metrics";
import Settings from "./pages/Settings";
import Savings from "./pages/Savings";
import Goals from "./pages/Goals";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <UserProfileProvider>
        <PrivacyProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="categories" element={<Categories />} />
              <Route path="diezmos" element={<Diezmos />} />
              <Route path="savings" element={<Savings />} />
              <Route path="goals" element={<Goals />} />
              <Route path="settings" element={<Settings />} />
              <Route path="metrics" element={<Metrics />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
          </TooltipProvider>
        </PrivacyProvider>
      </UserProfileProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
