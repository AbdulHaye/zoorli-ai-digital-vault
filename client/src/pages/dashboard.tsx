import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  Upload, 
  Files,
  Brain, 
  BarChart3,
  Settings,
  LogOut,
  User,
  Zap,
  Archive,
  Crown,
  Loader2,
  Search,
  Send,
  Mic
} from "lucide-react"
import { auth } from '@/lib/auth'
import UploadModal from '@/components/UploadModal'
import FileManager from '@/components/FileManager'
import AIChatbot from '@/components/AIChatbot'
import { useQuery } from '@tanstack/react-query'
import { useProfilePictureUrl } from '@/hooks/useProfilePictureUrl'
import { useToast } from "@/hooks/use-toast"
import vaultLogo from '@assets/generated_images/zorli-vault-logo.png'

export default function Dashboard() {
  const [, navigate] = useLocation()
  const [authState, setAuthState] = useState(auth.getState())
  const [uploadCount, setUploadCount] = useState(0)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [initialMessage, setInitialMessage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
  
  // Get signed URL for profile picture
  const profilePictureUrl = useProfilePictureUrl(authState.user?.profilePictureUrl)

  // Fetch dashboard metrics using TanStack Query
  const { data: metricsData, isLoading: metricsLoading, isFetching: metricsFetching, error: metricsError } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    enabled: authState.isAuthenticated,
  })

  // Fetch user's usage data for limit checking
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['/api/subscriptions/usage'],
    enabled: authState.isAuthenticated,
  })

  // Helper function to format bytes to readable storage size
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024))
    const size = bytes / Math.pow(1024, unitIndex)
    return `${size.toFixed(unitIndex > 1 ? 1 : 0)} ${units[unitIndex]}`
  }

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
    console.log('Files uploaded from dashboard:', files)
    setUploadCount(prev => prev + files.length)
  }


  const handleLogout = () => {
    auth.logout()
    navigate('/')
  }

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setInitialMessage(searchQuery)
      setIsChatbotOpen(true)
      setSearchQuery('') // Clear the input after submitting
    }
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop()
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          }
        } catch (error) {
          console.error('Error stopping recording on unmount:', error)
        }
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current)
      }
    }
  }, [])

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      })
      
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        })
        
        stream.getTracks().forEach(track => track.stop())
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
        if (maxRecordingTimeoutRef.current) {
          clearTimeout(maxRecordingTimeoutRef.current)
          maxRecordingTimeoutRef.current = null
        }
        setRecordingTime(0)
        
        setIsTranscribing(true)
        await transcribeWithWhisper(audioBlob)
        setIsTranscribing(false)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      maxRecordingTimeoutRef.current = setTimeout(() => {
        stopAudioRecording()
      }, 60000)
    } catch (error) {
      console.error('Failed to start recording:', error)
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
        duration: 2300,
      })
    }
  }

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeWithWhisper = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers: auth.getAuthHeaders(),
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSearchQuery(data.text || '')
    } catch (error) {
      console.error('Transcription error:', error)
      toast({
        title: "Transcription failed",
        description: "Could not transcribe audio. Please try typing your message.",
        variant: "destructive",
        duration: 2300,
      })
    }
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      stopAudioRecording()
    } else {
      startAudioRecording()
    }
  }

  // Get metrics data with proper type handling
  const metrics = metricsData as { success: boolean; data: { 
    filesCount: number; 
    aiAnalysesCount: number; 
    storageUsedBytes: number; 
  } } | undefined;

  // Get usage data for limit checking
  const usage = (usageData as any)?.data as {
    filesCount: number;
    aiPromptsCount: number;
    maxFiles: number;
    maxAIPrompts: number;
  } | undefined;

  // Check if user has reached their file upload limit
  const hasReachedFileLimit = usage ? (
    usage.maxFiles !== -1 && usage.filesCount >= usage.maxFiles
  ) : false;

  // Check if user has reached their AI prompt limit
  const hasReachedAILimit = usage ? (
    usage.maxAIPrompts !== -1 && usage.aiPromptsCount >= usage.maxAIPrompts
  ) : false;

  // Create stats array with real-time data
  const stats = [
    { 
      label: 'Files Uploaded', 
      value: metricsLoading ? '...' : metricsError ? 'Error' : (metrics?.data?.filesCount || 0).toString(), 
      icon: Archive 
    },
    { 
      label: 'AI Analyses', 
      value: metricsLoading ? '...' : metricsError ? 'Error' : (metrics?.data?.aiAnalysesCount || 0).toString(), 
      icon: Brain 
    },
    { 
      label: 'Storage Used', 
      value: metricsLoading ? '...' : metricsError ? 'Error' : formatStorageSize(metrics?.data?.storageUsedBytes || 0), 
      icon: Upload 
    }
  ]

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
                Zorli AI Vault
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {authState.isLoading ? (
                <div className="text-sm text-muted-foreground">Authenticating...</div>
              ) : authState.isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2">
                    {authState.user && (
                      <Avatar key={profilePictureUrl || 'no-pic'} className="w-6 h-6" data-testid="avatar-user-header">
                        {profilePictureUrl && (
                          <AvatarImage 
                            src={profilePictureUrl} 
                            alt={authState.user.username}
                            onError={(e) => console.error('Header avatar image failed to load:', e)}
                          />
                        )}
                        <AvatarFallback className="text-xs">
                          {authState.user.username?.slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <p className="text-muted-foreground">
                      Welcome back, {authState.user?.username || 'User'}
                    </p>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => navigate('/upgrade')}
                    data-testid="button-upgrade-plan"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade Your Plan
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/')}
                  data-testid="button-signin"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* AI Assistant Search */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Search your files</h2>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <Input
              type="text"
              placeholder={isTranscribing ? "Transcribing..." : "What are you looking for?"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="h-14 pl-12 pr-24 text-base"
              disabled={isRecording || isTranscribing}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleVoiceInput}
                className="h-8 w-8 p-0"
                disabled={isTranscribing}
                title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice input"}
              >
                {isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                ) : isRecording ? (
                  <div className="flex items-center gap-1">
                    <Mic className="w-4 h-4 text-red-500" />
                    <span className="text-xs text-red-500 font-semibold">{recordingTime}s</span>
                  </div>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSearchSubmit}
                className="h-8 w-8 p-0"
                disabled={!searchQuery.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <h2 className="text-xl font-semibold mb-4">Usage Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            const isFilesUploadedStat = stat.label === 'Files Uploaded'
            const showSpinner = isFilesUploadedStat && metricsFetching && !metricsLoading
            
            return (
              <Card key={index} className="hover-elevate">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {stat.label}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          {stat.value}
                        </p>
                        {showSpinner && (
                          <Loader2 
                            className="w-5 h-5 text-primary animate-spin" 
                            data-testid="spinner-files-uploaded"
                          />
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Upload Action */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    File Upload
                  </CardTitle>
                  <CardDescription>
                    {hasReachedFileLimit 
                      ? `You've reached your file upload limit (${usage?.filesCount}/${usage?.maxFiles}). Upgrade to continue.`
                      : 'Upload and manage your files with AI-powered analysis'
                    }
                  </CardDescription>
                </div>
                {uploadCount > 0 && !hasReachedFileLimit && (
                  <Badge variant="default" data-testid="upload-session-count">
                    {uploadCount} uploaded this session
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto" 
                  disabled
                  data-testid="button-storage-limit-loading"
                >
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking Limits...
                </Button>
              ) : hasReachedFileLimit ? (
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto" 
                  onClick={() => navigate('/upgrade')}
                  data-testid="button-upgrade-plan-upload"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Your Plan
                </Button>
              ) : (
                <UploadModal 
                  onUploadComplete={handleUploadComplete}
                  trigger={
                    <Button size="lg" className="w-full sm:w-auto" data-testid="button-upload-files">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Management */}
        <FileManager key={uploadCount} />
      </div>

      {/* AI Chatbot - Only show when authenticated */}
      {authState.isAuthenticated && (
        <AIChatbot 
          onFileSelect={(fileId) => setSelectedFileId(fileId)}
          isOpen={isChatbotOpen}
          onOpenChange={setIsChatbotOpen}
          initialMessage={initialMessage}
          onMessageSent={() => setInitialMessage(null)}
        />
      )}
    </div>
  )
}
