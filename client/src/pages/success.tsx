import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { auth } from '@/lib/auth';

export default function SuccessPage() {
  const [, navigate] = useLocation();
  const [verified, setVerified] = useState(false);
  const queryClient = useQueryClient();
  
  // Get session_id from URL
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  // Poll subscription data to detect when webhook has processed
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscriptions/current'],
    enabled: !!auth.getCurrentUser() && !verified,
    refetchInterval: verified ? false : 2000, // Poll every 2 seconds until verified
  });

  useEffect(() => {
    if (!auth.getCurrentUser()) {
      navigate('/');
      return;
    }

    // Check if subscription has been updated
    const subscription = (subscriptionData as any)?.data;
    if (subscription?.plan && subscription.plan.name !== 'free' && subscription.status === 'active') {
      setVerified(true);
      
      // Invalidate all relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      
      // Redirect to dashboard after a brief success message
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  }, [subscriptionData, verified, navigate, queryClient]);

  if (!sessionId) {
    navigate('/upgrade');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="success-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {verified ? (
            <>
              <div className="mx-auto mb-4">
                <CheckCircle2 className="w-16 h-16 text-primary" data-testid="icon-payment-success" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-payment-success">Payment Successful!</CardTitle>
              <CardDescription data-testid="text-success-description">
                Your subscription has been activated. Redirecting to dashboard...
              </CardDescription>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4">
                <Loader2 className="w-16 h-16 text-primary animate-spin" data-testid="icon-payment-processing" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-payment-processing">Processing Payment</CardTitle>
              <CardDescription data-testid="text-processing-description">
                Please wait while we confirm your subscription...
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground" data-testid="text-success-message">
          {verified ? (
            <p>Thank you for upgrading! You now have access to all premium features.</p>
          ) : (
            <p>This usually takes just a few seconds. Do not close this page.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
