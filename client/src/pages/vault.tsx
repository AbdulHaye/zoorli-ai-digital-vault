import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, FolderOpen, BarChart3, Settings } from 'lucide-react'
import FileUpload from '@/components/FileUpload'
import FileManager from '@/components/FileManager'
import { auth } from '@/lib/auth'

export default function Vault() {
  const [, navigate] = useLocation()
  const [uploadCount, setUploadCount] = useState(0)
  const [authState, setAuthState] = useState(auth.getState())

  useEffect(() => {
    const unsubscribe = auth.subscribe((newAuthState) => {
      setAuthState(newAuthState)
    })
    
    return unsubscribe
  }, [])

  // Redirect unauthenticated users to home page
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/')
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate])

  const handleUploadComplete = (files: any[]) => {
    console.log('Files uploaded:', files)
    setUploadCount(prev => prev + files.length)
    // Show success notification is handled by FileUpload component
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">
            AI Vault Dashboard
          </h1>
          <p className="text-muted-foreground mb-4">
            Secure file storage with AI-powered analysis and processing
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary" data-testid="badge-status">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              All Systems Operational
            </Badge>
            {uploadCount > 0 && (
              <Badge variant="default" data-testid="badge-upload-count">
                {uploadCount} files uploaded this session
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="upload" className="space-y-6" data-testid="vault-tabs">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="files" data-testid="tab-files">
              <FolderOpen className="w-4 h-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FileUpload 
                  onUploadComplete={handleUploadComplete}
                  maxFiles={10}
                  maxSize={50 * 1024 * 1024} // 50MB
                />
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Session Uploads</span>
                      <span className="font-semibold" data-testid="stat-session-uploads">{uploadCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Storage Used</span>
                      <span className="font-semibold">2.4 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">AI Credits</span>
                      <span className="font-semibold">847</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Supported Formats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Images</span>
                        <p className="text-muted-foreground text-xs">JPEG, PNG, GIF, WebP</p>
                      </div>
                      <div>
                        <span className="font-medium">Documents</span>
                        <p className="text-muted-foreground text-xs">PDF, TXT, MD</p>
                      </div>
                      <div>
                        <span className="font-medium">Audio</span>
                        <p className="text-muted-foreground text-xs">MP3, WAV, M4A</p>
                      </div>
                      <div>
                        <span className="font-medium">Video</span>
                        <p className="text-muted-foreground text-xs">MP4, MOV, AVI</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <FileManager />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card data-testid="analytics-storage">
                <CardHeader>
                  <CardTitle>Storage Usage</CardTitle>
                  <CardDescription>Total storage consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">2.4 GB</div>
                  <p className="text-sm text-muted-foreground">of 100 GB used</p>
                </CardContent>
              </Card>

              <Card data-testid="analytics-ai">
                <CardHeader>
                  <CardTitle>AI Analysis</CardTitle>
                  <CardDescription>Files processed this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">142</div>
                  <p className="text-sm text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>

              <Card data-testid="analytics-jobs">
                <CardHeader>
                  <CardTitle>Queue Status</CardTitle>
                  <CardDescription>Background job processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Active</span>
                    <Badge variant="default">3</Badge>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Completed</span>
                    <Badge variant="secondary">247</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Failed</span>
                    <Badge variant="destructive">2</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card data-testid="settings-account">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>Manage your account preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">User ID</label>
                    <p className="text-sm text-muted-foreground">{auth.getCurrentUser()?.id || 'Not logged in'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plan</label>
                    <p className="text-sm text-muted-foreground">Professional Plan</p>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="settings-integrations">
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                  <CardDescription>Connected services status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">OpenAI</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Stripe</span>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Object Storage</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}