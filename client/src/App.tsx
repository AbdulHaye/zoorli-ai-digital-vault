import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { auth } from "@/lib/auth";
import { useState, useEffect } from "react";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Vault from "@/pages/vault";
import AdminDashboard from "@/pages/admin";
import Payments from "@/pages/payments";
import SubscriptionPage from "@/pages/subscription";
import UpgradePage from "@/pages/upgrade";
import SuccessPage from "@/pages/success";
import PasswordsPage from "@/pages/passwords";
import Settings from "@/pages/settings";
import SmartFinder from "@/pages/smart-finder";
import VerifyEmail from "@/pages/verify-email";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Home page */}
      <Route path="/" component={Home} />
      {/* Dashboard page */}
      <Route path="/dashboard" component={Dashboard} />
      {/* Smart Finder page */}
      <Route path="/smart-finder" component={SmartFinder} />
      {/* Vault page */}
      <Route path="/vault" component={Vault} />
      {/* Subscription management page */}
      <Route path="/subscription" component={SubscriptionPage} />
      {/* Upgrade plan page */}
      <Route path="/upgrade" component={UpgradePage} />
      {/* Payment success page */}
      <Route path="/success" component={SuccessPage} />
      {/* Password vault page */}
      <Route path="/passwords" component={PasswordsPage} />
      {/* Settings page */}
      <Route path="/settings" component={Settings} />
      {/* Admin dashboard page */}
      <Route path="/admin" component={AdminDashboard} />
      {/* Payments page */}
      <Route path="/payments" component={Payments} />
      {/* Email verification page */}
      <Route path="/verify-email" component={VerifyEmail} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [authState, setAuthState] = useState(auth.getState());
  const [location, navigate] = useLocation();

  useEffect(() => {
    const unsubscribe = auth.subscribe((newAuthState) => {
      setAuthState(newAuthState);
    });
    return unsubscribe;
  }, []);

  // Redirect authenticated users to dashboard on app load
  useEffect(() => {
    // Only redirect when auth check is complete (not loading)
    if (!authState.isLoading && authState.isAuthenticated) {
      // Define valid routes for authenticated users
      const validRoutes = [
        '/dashboard',
        '/smart-finder',
        '/vault',
        '/subscription',
        '/upgrade',
        '/success',
        '/passwords',
        '/settings',
        '/admin',
        '/payments',
        '/verify-email'
      ];
      
      // If user is on home page or an invalid route, redirect based on role
      const isValidRoute = validRoutes.some(route => location.startsWith(route));
      if (location === '/' || !isValidRoute) {
        // Redirect admin users to admin dashboard, regular users to main dashboard
        const isAdmin = authState.user?.role === 'admin';
        navigate(isAdmin ? '/admin' : '/dashboard');
      }
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.user?.role, location, navigate]);

  // Determine if we should show the sidebar
  // Show sidebar only when authenticated and not on home page
  const showSidebar = authState.isAuthenticated && location !== "/";

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showSidebar ? (
          <SidebarProvider style={style as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center p-2 border-b">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
        ) : (
          <Router />
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
