import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DollarSign } from "lucide-react"
import { auth } from '@/lib/auth'
import { useQuery } from '@tanstack/react-query'

// Helper function to format dates
const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

export default function Payments() {
  const [, navigate] = useLocation()
  const [authState, setAuthState] = useState(auth.getState())
  const [planFilter, setPlanFilter] = useState<string>('all')

  useEffect(() => {
    const unsubscribe = auth.subscribe((newAuthState) => {
      setAuthState(newAuthState)
    })
    
    return unsubscribe
  }, [])

  // Check if user is admin
  const isAdmin = (authState.user as any)?.role === 'admin'

  // Redirect unauthenticated users to home page
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/')
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate])

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (!authState.isLoading && authState.isAuthenticated && authState.user && !isAdmin) {
      navigate('/dashboard')
    }
  }, [authState.isLoading, authState.isAuthenticated, authState.user, isAdmin, navigate])

  // Fetch payments data
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['/api/admin/payments'],
    queryFn: async () => {
      const response = await fetch('/api/admin/payments', {
        headers: {
          ...auth.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }
      return response.json()
    },
    enabled: isAdmin,
  })

  // Filter payments based on selected plan
  const filteredPayments = useMemo(() => {
    if (!paymentsData?.data) return []
    
    if (planFilter === 'all') {
      return paymentsData.data
    }
    
    return paymentsData.data.filter((payment: any) => 
      payment.plan.toLowerCase() === planFilter.toLowerCase()
    )
  }, [paymentsData?.data, planFilter])


  // Show loading only while checking auth status
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
          <div className="text-muted-foreground">Verifying credentials...</div>
        </div>
      </div>
    )
  }

  // Show loading state for unauthenticated users while redirecting
  if (!authState.isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Redirecting...</div>
          <div className="text-muted-foreground">Please wait...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <CardTitle data-testid="text-payments-title">Payment Management</CardTitle>
              </div>
              <CardDescription>
                View and manage all payment transactions across the platform.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="plus">Plus</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="text-center py-8">
              <div className="text-lg">Loading payments...</div>
            </div>
          ) : paymentsError ? (
            <div className="text-center py-8 text-destructive">
              Failed to load payments. Please refresh the page.
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {planFilter === 'all' 
                ? 'No payments found.' 
                : `No payments found for ${planFilter.charAt(0).toUpperCase() + planFilter.slice(1)} plan.`}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount Paid (USD)</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="font-medium" data-testid={`text-user-${payment.id}`}>
                        <div className="flex flex-col">
                          <span>{payment.username || 'N/A'}</span>
                          <span className="text-xs text-muted-foreground">{payment.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-plan-${payment.id}`}>
                        <Badge variant="outline">
                          {payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-amount-${payment.id}`}>
                        <span className="font-semibold">${payment.amountUSD}</span>
                      </TableCell>
                      <TableCell data-testid={`text-period-${payment.id}`}>
                        {payment.periodStart && payment.periodEnd ? (
                          <div className="text-sm">
                            <div>{formatDate(payment.periodStart)}</div>
                            <div className="text-muted-foreground text-xs">to</div>
                            <div>{formatDate(payment.periodEnd)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-status-${payment.id}`}>
                        <Badge 
                          variant={
                            payment.status === 'active' ? 'success' :
                            payment.status === 'canceled' ? 'destructive' :
                            payment.status === 'past_due' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1).replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-created-${payment.id}`}>
                        <span className="text-sm">
                          {formatDate(payment.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
