import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Zap, 
  Check, 
  X, 
  Calendar, 
  CreditCard,
  AlertCircle,
  TrendingUp,
  FileText,
  Key,
  ArrowLeft
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  maxFiles: number;
  maxAIPrompts: number;
  features: string[];
  stripePriceId: string | null;
}

interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

interface UsageData {
  filesCount: number;
  aiPromptsCount: number;
  maxFiles: number;
  maxAIPrompts: number;
}

export default function SubscriptionPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
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
      navigate('/');
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate]);

  // Fetch user's current subscription with real-time updates
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscriptions/current'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
  });

  // Fetch user's usage data with real-time updates
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['/api/subscriptions/usage'],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
  });

  const subscription = (subscriptionData as any)?.data as UserSubscription | undefined;
  const usage = (usageData as any)?.data as UsageData | undefined;

  // Cancel subscription mutation
  const cancelSubscription = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/subscriptions/cancel');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Subscription canceled',
        description: 'Your subscription will end at the end of the current billing period.',
        duration: 2300,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
      setCancelDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
        duration: 2300,
      });
    },
  });

  const handleCancel = () => {
    cancelSubscription.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: 'default',
      trialing: 'secondary',
      canceled: 'destructive',
      past_due: 'destructive',
    };
    return (
      <Badge 
        variant={variants[status] || 'secondary'}
        className={status === 'active' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const currentPlan = subscription?.plan;
  const isFreePlan = !subscription || subscription.status === 'canceled';

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to manage your subscription</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/')} data-testid="button-signin">
              Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back to Dashboard Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">
            Subscription Management
          </h1>
          <p className="text-muted-foreground">
            Manage your plan, usage, and billing settings
          </p>
        </div>

        {/* Current Plan Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  Current Plan
                </CardTitle>
                <CardDescription>Your active subscription details</CardDescription>
              </div>
              {subscription && getStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscriptionLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold" data-testid="text-current-plan">
                      {currentPlan?.displayName || 'free'}
                    </h3>
                    <p className="text-muted-foreground">
                      {currentPlan?.description || 'Intelligence for everyday tasks'}
                    </p>
                  </div>
                  {currentPlan && currentPlan.priceMonthly > 0 && (
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${currentPlan.priceMonthly / 100}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        per month
                      </div>
                    </div>
                  )}
                </div>

                {subscription && subscription.stripeSubscriptionId && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Billing Period</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Payment Method</p>
                          <p className="text-sm text-muted-foreground">
                            Stripe (••••)
                          </p>
                        </div>
                      </div>
                    </div>

                    {subscription.cancelAtPeriodEnd && (
                      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-destructive" />
                        <p className="text-sm">
                          Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="default"
              onClick={() => navigate('/upgrade')}
              data-testid="button-upgrade-plan"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Your Plan
            </Button>
            {subscription && subscription.stripeSubscriptionId && !subscription.cancelAtPeriodEnd && (
              <Button
                variant="destructive"
                onClick={() => setCancelDialogOpen(true)}
                data-testid="button-cancel-subscription"
              >
                Cancel Subscription
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Usage Statistics
            </CardTitle>
            <CardDescription>Track your usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {usageLoading ? (
              <div className="text-center py-8">Loading usage data...</div>
            ) : usage ? (
              <>
                {/* Files Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Files Uploaded</span>
                    </div>
                    <span className="text-sm text-muted-foreground" data-testid="text-files-usage">
                      {usage.filesCount} / {usage.maxFiles === -1 ? 'Unlimited' : usage.maxFiles}
                    </span>
                  </div>
                  {usage.maxFiles !== -1 && (
                    <Progress 
                      value={(usage.filesCount / usage.maxFiles) * 100} 
                      className="h-2"
                    />
                  )}
                </div>

                {/* AI Prompts Usage */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">AI Prompts Used</span>
                    </div>
                    <span className="text-sm text-muted-foreground" data-testid="text-prompts-usage">
                      {usage.aiPromptsCount} / {usage.maxAIPrompts === -1 ? 'Unlimited' : usage.maxAIPrompts}
                    </span>
                  </div>
                  {usage.maxAIPrompts !== -1 && (
                    <Progress 
                      value={(usage.aiPromptsCount / usage.maxAIPrompts) * 100} 
                      className="h-2"
                    />
                  )}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">No usage data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of the current billing period.
              After that, you'll be downgraded to the Free plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-cancel">
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-cancel-dialog-confirm"
            >
              {cancelSubscription.isPending ? 'Canceling...' : 'Cancel Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
