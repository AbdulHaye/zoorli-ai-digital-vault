import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { User, Mail, Calendar, CreditCard, Shield, Camera, Edit2, Check, X, Loader2, Trash2 } from "lucide-react"
import { auth } from '@/lib/auth'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiRequest, queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast'
import { useProfilePictureUrl } from '@/hooks/useProfilePictureUrl'

export default function Settings() {
  const [, navigate] = useLocation()
  const [authState, setAuthState] = useState(auth.getState())
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // Get signed URL for profile picture
  const profilePictureUrl = useProfilePictureUrl(authState.user?.profilePictureUrl)

  useEffect(() => {
    const unsubscribe = auth.subscribe((newAuthState) => {
      setAuthState(newAuthState)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/')
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate])

  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscriptions/current'],
    enabled: authState.isAuthenticated,
  })

  const subscription = (subscriptionData as any)?.data

  // Profile picture upload mutation
  const profilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('profilePicture', file)
      
      const response = await fetch('/api/user/profile-picture', {
        method: 'POST',
        headers: {
          ...auth.getAuthHeaders(),
        },
        body: formData,
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload profile picture')
      }
      
      return response.json()
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
        duration: 2300,
      })
      // Refresh auth state to get updated user data
      await auth.refreshUser()
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 2300,
      })
    },
  })

  // Profile picture removal mutation
  const removeProfilePictureMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/profile-picture', {
        method: 'DELETE',
        headers: {
          ...auth.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove profile picture')
      }
      
      return response.json()
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Profile picture removed successfully",
        duration: 2300,
      })
      // Refresh auth state to get updated user data
      await auth.refreshUser()
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 2300,
      })
    },
  })

  // Username update mutation
  const usernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest('PUT', '/api/user/username', { username })
      return response.json()
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Username updated successfully",
        duration: 2300,
      })
      setIsEditingUsername(false)
      setUsernameError('')
      // Refresh auth state to get updated user data
      await auth.refreshUser()
    },
    onError: (error: Error) => {
      setUsernameError(error.message)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
        duration: 2300,
      })
    },
  })

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
        duration: 2300,
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Profile picture must be less than 5MB",
        variant: "destructive",
        duration: 2300,
      })
      return
    }

    profilePictureMutation.mutate(file)
  }

  const handleUsernameEdit = () => {
    setNewUsername(user?.username || '')
    setUsernameError('')
    setIsEditingUsername(true)
  }

  const handleUsernameSave = () => {
    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_ ]{3,50}$/
    if (!usernameRegex.test(newUsername)) {
      setUsernameError('Username must be 3-50 characters long and contain only letters, numbers, underscores, or spaces')
      return
    }

    usernameMutation.mutate(newUsername)
  }

  const handleUsernameCancel = () => {
    setIsEditingUsername(false)
    setUsernameError('')
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (email?: string, username?: string) => {
    if (username) {
      return username.slice(0, 2).toUpperCase()
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const user = authState.user

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#2B6CB0' }}>
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Your personal account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar key={profilePictureUrl || 'no-pic'} className="h-20 w-20" data-testid="avatar-profile">
                  {profilePictureUrl && (
                    <AvatarImage 
                      src={profilePictureUrl} 
                      alt={user?.username || 'User'}
                      onError={(e) => console.error('Avatar image failed to load:', e)}
                    />
                  )}
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(user?.email, user?.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 rounded-full shadow-md"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={profilePictureMutation.isPending || removeProfilePictureMutation.isPending}
                    data-testid="button-upload-profile-picture"
                  >
                    {profilePictureMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                  {profilePictureUrl && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7 rounded-full shadow-md"
                          disabled={profilePictureMutation.isPending || removeProfilePictureMutation.isPending}
                          data-testid="button-remove-profile-picture"
                        >
                          {removeProfilePictureMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Profile Picture</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove your profile picture? Your initials will be displayed instead.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeProfilePictureMutation.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                  data-testid="input-profile-picture"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold" data-testid="text-username">
                  {user?.username || 'User'}
                </h3>
                <p className="text-muted-foreground" data-testid="text-email">
                  {user?.email}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {user?.role === 'admin' ? 'Administrator' : 'User'}
                  </Badge>
                  {user?.isEmailVerified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Username</p>
                  {isEditingUsername ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          placeholder="Enter new username"
                          className="max-w-xs"
                          data-testid="input-username"
                        />
                        <Button
                          size="icon"
                          variant="default"
                          onClick={handleUsernameSave}
                          disabled={usernameMutation.isPending}
                          data-testid="button-save-username"
                        >
                          {usernameMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={handleUsernameCancel}
                          disabled={usernameMutation.isPending}
                          data-testid="button-cancel-username"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {usernameError && (
                        <p className="text-sm text-destructive" data-testid="text-username-error">
                          {usernameError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-medium" data-testid="profile-username">
                        {user?.username || 'N/A'}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleUsernameEdit}
                        data-testid="button-edit-username"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium" data-testid="profile-email">
                    {user?.email || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium" data-testid="profile-created-at">
                    {formatDate(user?.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {subscription && user?.role !== 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium capitalize" data-testid="profile-plan">
                      {subscription.plan?.name || 'Free'}
                    </p>
                    <Badge 
                      variant={subscription.status === 'active' ? 'default' : 'secondary'}
                      className={subscription.status === 'active' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                      data-testid="profile-subscription-status"
                    >
                      {(subscription.status || 'active').charAt(0).toUpperCase() + (subscription.status || 'active').slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {subscription.stripe_subscription_id && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Subscription ID</p>
                    <p className="font-mono text-sm" data-testid="profile-subscription-id">
                      {subscription.stripe_subscription_id}
                    </p>
                  </div>
                </div>
              )}

              {subscription.current_period_end && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded-full">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Next Billing Date</p>
                    <p className="font-medium" data-testid="profile-next-billing">
                      {formatDate(subscription.current_period_end)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
