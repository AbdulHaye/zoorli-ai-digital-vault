import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { auth } from "@/lib/auth";

interface PlanCardProps {
  name: string;
  displayName: string;
  description: string;
  price: number;
  features: string[];
  isCurrentPlan: boolean;
  isRecommended?: boolean;
  paymentLink?: string;
}

function PlanCard({
  name,
  displayName,
  description,
  price,
  features,
  isCurrentPlan,
  isRecommended,
  paymentLink,
}: PlanCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    const { isAuthenticated } = auth.getState();
    if (!isAuthenticated) {
      console.error("Not authenticated - cannot proceed with payment");
      return;
    }

    setIsLoading(true);
    try {
      // Create Checkout Session via API
      const authHeaders = auth.getAuthHeaders();
      console.log("[Upgrade] Creating checkout session for plan:", name, "with priceId:", paymentLink);
      
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          priceId: paymentLink, // Now paymentLink contains Stripe Price ID
          planName: name,
        }),
      });

      console.log("[Upgrade] Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Upgrade] Error response:", errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      console.log("[Upgrade] Response data:", data);
      
      const url = data.data?.url || data.url;
      console.log("[Upgrade] Redirecting to:", url);
      
      if (!url) {
        throw new Error('No checkout URL returned from server');
      }
      
      // Open Stripe Checkout in a new tab
      // This is necessary because the Replit iframe environment can block Stripe's checkout page
      const checkoutWindow = window.open(url, '_blank');
      
      if (!checkoutWindow) {
        // Fallback if popup is blocked
        alert('Please allow popups to proceed with payment. Click OK to try again.');
        window.location.href = url;
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert(`Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  return (
    <Card className={`relative ${isRecommended ? "border-primary" : ""}`}>
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            RECOMMENDED
          </Badge>
        </div>
      )}

      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-xl mb-1">{displayName}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="text-sm">$</span>
          <span className="text-4xl font-bold">{price / 100}</span>
          <span className="text-sm text-muted-foreground">USD / month</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {isCurrentPlan ? (
          <div className="py-2 px-4 bg-muted rounded-md text-center text-sm font-medium">
            Your current plan
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={handleUpgrade}
            disabled={!paymentLink || isLoading}
            data-testid={`button-select-${name}`}
          >
            {isLoading ? "Loading..." : `Get ${displayName}`}
          </Button>
        )}

        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Note: Price IDs now come from the API response (stripePriceId field)

export default function UpgradePage() {
  const [, navigate] = useLocation();
  const [authState, setAuthState] = useState(auth.getState());

  useEffect(() => {
    const unsubscribe = auth.subscribe((newAuthState) => {
      setAuthState(newAuthState);
    });

    return unsubscribe;
  }, []);

  const user = authState.user;

  // Redirect unauthenticated users to home page
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate("/");
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate]);

  // Fetch user's current subscription
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    enabled: !!user,
  });

  // Fetch available plans from API
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ["/api/subscription/plans"],
    enabled: !!user,
  });

  const subscription = (subscriptionData as any)?.data;
  const currentPlanName = subscription?.plan?.name || "free";
  const allPlans = (plansData as any)?.data || [];

  if (!user) {
    navigate("/");
    return null;
  }

  // Loading state
  if (plansLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  // Find the 3 main plans to display
  const freePlan = allPlans.find((p: any) => p.name === "free");
  const basicPlan = allPlans.find((p: any) => p.name === "basic");
  const plusPlan = allPlans.find((p: any) => p.name === "plus");

  if (!freePlan || !basicPlan || !plusPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Plans Unavailable</CardTitle>
            <CardDescription>
              Unable to load subscription plans. Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Upgrade your plan</h1>
            <p className="text-muted-foreground">
              Choose the perfect plan for your needs
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            data-testid="button-close-upgrade"
          >
            <X className="w-5 h-5" />
            Close
          </Button>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <PlanCard
            name={freePlan.name}
            displayName={freePlan.displayName}
            description={freePlan.description}
            price={freePlan.priceMonthly || 0}
            features={freePlan.features || []}
            isCurrentPlan={currentPlanName === "free"}
          />

          <PlanCard
            name={basicPlan.name}
            displayName={basicPlan.displayName}
            description={basicPlan.description}
            price={basicPlan.priceMonthly || 0}
            features={basicPlan.features || []}
            isCurrentPlan={currentPlanName === "basic"}
            isRecommended={true}
            paymentLink={basicPlan.stripePriceId}
          />

          <PlanCard
            name={plusPlan.name}
            displayName={plusPlan.displayName}
            description={plusPlan.description}
            price={plusPlan.priceMonthly || 0}
            features={plusPlan.features || []}
            isCurrentPlan={currentPlanName === "plus"}
            paymentLink={plusPlan.stripePriceId}
          />
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            All plans can be canceled anytime from your subscription settings.
          </p>
        </div>
      </div>
    </div>
  );
}
