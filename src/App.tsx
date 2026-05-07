import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Orders from "./pages/Orders.tsx";
import POS from "./pages/POS.tsx";
import Inventory from "./pages/Inventory.tsx";
import Expenses from "./pages/Expenses.tsx";
import Reports from "./pages/Reports.tsx";
import Settings from "./pages/Settings.tsx";
import Customers from "./pages/Customers.tsx";
import Staff from "./pages/Staff.tsx";
import { DashboardLayout } from "./components/DashboardLayout.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { RequirePermission } from "./components/RequirePermission.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<RequirePermission permission="access_orders"><Orders /></RequirePermission>} />
            <Route path="pos" element={<RequirePermission permission="access_pos"><POS /></RequirePermission>} />
            <Route path="customers" element={<RequirePermission permission="access_customers"><Customers /></RequirePermission>} />
            <Route path="inventory" element={<RequirePermission permission="access_inventory"><Inventory /></RequirePermission>} />
            <Route path="expenses" element={<RequirePermission permission="access_expenses"><Expenses /></RequirePermission>} />
            <Route path="staff" element={<RequirePermission permission="access_staff"><Staff /></RequirePermission>} />
            <Route path="reports" element={<RequirePermission permission="view_reports"><Reports /></RequirePermission>} />
            <Route path="settings" element={<RequirePermission permission="access_settings"><Settings /></RequirePermission>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
