import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Users, 
  Settings,
  LogOut,
  User,
  Trash2,
  AlertTriangle,
  Shield,
  Search,
  CreditCard,
  FileText,
  Lock,
  DollarSign,
  ArrowLeft,
  Loader2
} from "lucide-react"
import { auth } from '@/lib/auth'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { useProfilePictureUrl } from '@/hooks/useProfilePictureUrl'
import vaultLogo from '@assets/generated_images/zorli-vault-logo.png'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

// Helper function to calculate billing period
const getBillingPeriod = (user: any) => {
  const planName = user.subscription?.planName || 'Free';
  const startDate = user.subscription?.currentPeriodStart;
  const endDate = user.subscription?.currentPeriodEnd;
  
  // Free plan users don't have billing periods
  if (planName === 'Free' || !startDate || !endDate) {
    return 'N/A';
  }
  
  // Calculate the difference in months
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Determine if it's monthly or yearly based on the period
  if (diffDays >= 350) {
    return 'Yearly';
  } else if (diffDays >= 28) {
    return 'Monthly';
  } else {
    return `${diffDays} days`;
  }
};

export default function AdminDashboard() {
  const [location, navigate] = useLocation()
  const [authState, setAuthState] = useState(auth.getState())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)
  const [isDeletingSingle, setIsDeletingSingle] = useState(false)
  
  // Get signed URL for profile picture
  const profilePictureUrl = useProfilePictureUrl(authState.user?.profilePictureUrl)
  
  const { toast} = useToast()

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
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin dashboard.",
        variant: "destructive",
        duration: 2300,
      })
      navigate('/dashboard')
    }
  }, [authState.isLoading, authState.isAuthenticated, authState.user, isAdmin, toast, navigate])

  // Fetch all users
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users', {
        headers: {
          ...auth.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch users')
      }
      
      return await response.json()
    },
    enabled: authState.isAuthenticated && isAdmin,
  })

  // Fetch subscription statistics
  const { data: subscriptionStats, isLoading: subscriptionStatsLoading } = useQuery({
    queryKey: ['/api/admin/subscription-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/subscription-stats', {
        headers: {
          ...auth.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription stats')
      }
      
      const result = await response.json()
      return result.data
    },
    enabled: authState.isAuthenticated && isAdmin,
  })

  // Fetch usage statistics
  const { data: usageStats, isLoading: usageStatsLoading } = useQuery({
    queryKey: ['/api/admin/usage-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/usage-stats', {
        headers: {
          ...auth.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch usage stats')
      }
      
      const result = await response.json()
      return result.data
    },
    enabled: authState.isAuthenticated && isAdmin,
  })


  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          ...auth.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete user')
      }
      
      return await response.json()
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] })
      toast({
        title: "User Deleted",
        description: data.message,
        duration: 2300,
      })
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
        duration: 2300,
      })
    },
  })

  const handleLogout = () => {
    auth.logout()
    navigate('/')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const handleDeleteUser = async (userId: string) => {
    if (isDeletingSingle) return // Prevent duplicate calls
    
    setIsDeletingSingle(true)
    try {
      await deleteUserMutation.mutateAsync(userId)
    } finally {
      setIsDeletingSingle(false)
    }
  }

  // Multi-select handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    setSelectedUsers([])
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(selectableUsers.map((u: any) => u.id))
    }
  }

  const handleBatchDelete = () => {
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    setIsBatchDeleting(true)
    const failedDeletions: string[] = []
    let successCount = 0

    try {
      for (const id of selectedUsers) {
        try {
          await apiRequest('DELETE', `/api/admin/users/${id}`)
          successCount++
        } catch (error) {
          console.error(`Failed to delete user ${id}:`, error)
          failedDeletions.push(id)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] })

      if (failedDeletions.length === 0) {
        toast({
          title: 'Users deleted',
          description: `${successCount} user(s) have been deleted successfully.`,
        })
        setSelectedUsers([])
        setSelectionMode(false)
        setBatchDeleteDialogOpen(false)
      } else {
        toast({
          title: 'Partial deletion',
          description: `${successCount} user(s) deleted, but ${failedDeletions.length} failed. Please try again.`,
          variant: 'destructive',
        })
        // Keep only the failed items selected for retry
        setSelectedUsers(failedDeletions)
        setBatchDeleteDialogOpen(false)
      }
    } finally {
      setIsBatchDeleting(false)
    }
  }

  // Get users data for filtering (moved before conditional returns to fix hooks rule)
  const users = usersData?.data || []
  
  // Filter users based on search term (moved before conditional returns to fix hooks rule)
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return users
    }
    
    const term = searchTerm.toLowerCase()
    return users.filter((user: any) => 
      user.username?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.id?.toLowerCase().includes(term) ||
      user.role?.toLowerCase().includes(term)
    )
  }, [users, searchTerm])
  
  // Get selectable users (exclude admin users and current user)
  const selectableUsers = useMemo(() => {
    return filteredUsers.filter((user: any) => 
      user.role !== 'admin' && user.id !== authState.user?.id
    )
  }, [filteredUsers, authState.user?.id])

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
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Redirecting...</div>
          <div className="text-muted-foreground">Please sign in to continue</div>
        </div>
      </div>
    )
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src={vaultLogo} 
                alt="Zorli AI Vault Logo" 
                className="w-10 h-10 rounded-lg object-cover"
              />
              <h1 className="text-2xl font-bold" style={{ color: '#2B6CB0' }}>
                Zorli
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Welcome back, {authState.user?.username}!
              </p>
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 relative">
          {/* Loading Overlay for User Deletion */}
          {(isBatchDeleting || isDeletingSingle) && (
            <div 
              className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg"
              data-testid="delete-loading-overlay"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium text-foreground">
                {isBatchDeleting ? 'Deleting users...' : 'Deleting user...'}
              </p>
            </div>
          )}
          {/* User Stats Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">User Statistics</h2>
            <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-users">
                  {users.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-admin-count">
                  {users.filter((user: any) => user.role === 'admin').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-user-count">
                  {users.filter((user: any) => user.role === 'user' || !user.role).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-recent-users">
                  {users.filter((user: any) => {
                    const userDate = new Date(user.createdAt)
                    const weekAgo = new Date()
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return userDate >= weekAgo
                  }).length}
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Subscription Stats Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Subscription Statistics</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Free Tier</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-free-users">
                    {subscriptionStatsLoading ? '...' : (subscriptionStats?.freeUsers || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    10 files, 20 prompts
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Plus Subscribers</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-plus-users">
                    {subscriptionStatsLoading ? '...' : (subscriptionStats?.plusUsers || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    100 files, 500 prompts
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Business Subscribers</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-business-users">
                    {subscriptionStatsLoading ? '...' : (subscriptionStats?.businessUsers || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unlimited files & prompts
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-active-subscriptions">
                    {subscriptionStatsLoading ? '...' : (subscriptionStats?.activeSubscriptions || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paying customers
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Usage Stats Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Platform Usage</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Files Stored</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-files">
                    {usageStatsLoading ? '...' : (usageStats?.totalFiles || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all users
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Passwords Managed</CardTitle>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-passwords">
                    {usageStatsLoading ? '...' : (usageStats?.totalPasswords || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Encrypted credentials
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="text-users-title">User Management</CardTitle>
              <CardDescription>
                Manage user accounts and permissions. Use caution when deleting users.
              </CardDescription>
              <div className="flex items-center gap-2 mt-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username, email, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-users"
                  />
                </div>
                {!selectionMode && (
                  <Button
                    variant="outline"
                    onClick={toggleSelectionMode}
                    disabled={selectableUsers.length === 0}
                  >
                    Select
                  </Button>
                )}
                {selectionMode && (
                  <>
                    <Button
                      variant="outline"
                      onClick={toggleSelectAll}
                    >
                      {selectedUsers.length === selectableUsers.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleBatchDelete}
                      disabled={selectedUsers.length === 0 || isBatchDeleting}
                    >
                      {isBatchDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected ({selectedUsers.length})
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={toggleSelectionMode}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {searchTerm && !selectionMode && (
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredUsers.length} of {users.length} users
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg">Loading users...</div>
                </div>
              ) : usersError ? (
                <div className="text-center py-8 text-destructive">
                  Failed to load users. Please refresh the page.
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? `No users found matching "${searchTerm}".` : "No users found."}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectionMode && <TableHead className="w-12"></TableHead>}
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Email Status</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead>AI Prompts</TableHead>
                        <TableHead>Sub. Start</TableHead>
                        <TableHead>Sub. End</TableHead>
                        <TableHead>Billing Period</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user: any) => {
                        const isSelectable = user.role !== 'admin' && user.id !== authState.user?.id
                        const isSelected = selectedUsers.includes(user.id)
                        
                        return (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          {selectionMode && (
                            <TableCell>
                              {isSelectable && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleUserSelection(user.id)}
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell className="font-medium" data-testid={`text-username-${user.id}`}>
                            {user.username}
                          </TableCell>
                          <TableCell data-testid={`text-email-${user.id}`}>
                            {user.email}
                          </TableCell>
                          <TableCell data-testid={`text-email-status-${user.id}`}>
                            <Badge 
                              variant={user.isEmailVerified ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {user.isEmailVerified ? 'Verified' : 'Not Verified'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.role === 'admin' ? 'default' : 'secondary'}
                              data-testid={`badge-role-${user.id}`}
                            >
                              {(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-plan-${user.id}`}>
                            <span className="text-sm">
                              {user.role === 'admin' ? '--' : (user.subscription?.planName || 'Free Plan')}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-files-${user.id}`}>
                            <span className="text-sm text-muted-foreground">
                              {user.role === 'admin' ? '--' : (
                                <>
                                  <span className="text-foreground">{user.usage?.filesCount || 0}</span>
                                  {user.limits?.maxFiles !== -1 && (
                                    <span>
                                      /{user.limits?.maxFiles || 10}
                                    </span>
                                  )}
                                  {user.limits?.maxFiles === -1 && (
                                    <span>/∞</span>
                                  )}
                                </>
                              )}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-prompts-${user.id}`}>
                            <span className="text-sm text-muted-foreground">
                              {user.role === 'admin' ? '--' : (
                                <>
                                  <span className="text-foreground">{user.usage?.aiPromptsCount || 0}</span>
                                  {user.limits?.maxAIPrompts !== -1 && (
                                    <span>
                                      /{user.limits?.maxAIPrompts || 20}
                                    </span>
                                  )}
                                  {user.limits?.maxAIPrompts === -1 && (
                                    <span>/∞</span>
                                  )}
                                </>
                              )}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-sub-start-${user.id}`}>
                            <span className="text-sm">
                              {user.role === 'admin' ? '--' : formatDate(user.subscription?.currentPeriodStart)}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-sub-end-${user.id}`}>
                            <span className="text-sm">
                              {user.role === 'admin' ? '--' : formatDate(user.subscription?.currentPeriodEnd)}
                            </span>
                          </TableCell>
                          <TableCell data-testid={`text-billing-period-${user.id}`}>
                            <span className="text-sm">
                              {user.role === 'admin' ? '--' : getBillingPeriod(user)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {user.role === 'admin' ? (
                              <div className="flex items-center justify-end gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Protected
                                </Badge>
                              </div>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={user.id === authState.user?.id || deleteUserMutation.isPending}
                                    data-testid={`button-delete-${user.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent data-testid={`dialog-delete-${user.id}`}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete user "{user.username}"? 
                                      This action cannot be undone and will permanently remove 
                                      all their data including files and jobs.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel 
                                      disabled={isDeletingSingle}
                                      data-testid={`button-cancel-delete-${user.id}`}
                                    >
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      disabled={isDeletingSingle}
                                      data-testid={`button-confirm-delete-${user.id}`}
                                    >
                                      {isDeletingSingle ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        'Delete User'
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUsers.length} user(s)? 
              This action cannot be undone and will permanently remove all their data including files and jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isBatchDeleting}
            >
              {isBatchDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Users'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
