import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import WebsiteEditor from "./pages/WebsiteEditor.tsx";
import CustomerDisplay from "./pages/CustomerDisplay.tsx";
import SiteLayout from "./components/site/SiteLayout.tsx";
import Home from "./pages/site/Home.tsx";
import AboutPage from "./pages/site/About.tsx";
import MenuPage from "./pages/site/MenuPage.tsx";
import ContactPage from "./pages/site/Contact.tsx";
import OrderPage from "./pages/site/OrderPage.tsx";
import { CustomerCartProvider } from "./lib/customerCart.tsx";
import { DashboardLayout } from "./components/DashboardLayout.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { RequirePermission } from "./components/RequirePermission.tsx";
import { ThemeProvider } from "./lib/theme.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Customer-facing website */}
          <Route
            element={
              <CustomerCartProvider>
                <SiteLayout />
              </CustomerCartProvider>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/order" element={<OrderPage />} />
          </Route>

          {/* Staff area (unchanged) */}
          <Route path="/login" element={<Index />} />
          <Route path="/staff" element={<Navigate to="/login" replace />} />
          <Route path="/staff/website" element={<Navigate to="/dashboard/website" replace />} />
          <Route path="/pos" element={<Navigate to="/dashboard/pos" replace />} />
          <Route path="/customer-display" element={<CustomerDisplay />} />

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
            <Route
              path="website"
              element={
                <RequirePermission permission="manage_website" allowRoles={["admin"]}>
                  <WebsiteEditor />
                </RequirePermission>
              }
            />
            <Route path="reports" element={<RequirePermission permission="view_reports"><Reports /></RequirePermission>} />
            <Route path="settings" element={<RequirePermission permission="access_settings"><Settings /></RequirePermission>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
