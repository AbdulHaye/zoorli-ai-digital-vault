import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
  Send, 
  Bot, 
  User, 
  FileText, 
  Image as ImageIcon, 
  Download,
  Copy,
  Loader2,
  Trash2,
  Mic,
  MicOff,
  Square,
  Crown,
  Search,
  Sparkles
} from "lucide-react"
import { auth } from '@/lib/auth'
import { useToast } from "@/hooks/use-toast"
import type { InsertChatMessage } from '@shared/schema'
import { useLocation } from 'wouter'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfilePictureUrl } from '@/hooks/useProfilePictureUrl'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  files?: Array<{
    id: string
    filename: string
    fileType: string
    downloadUrl?: string
  }>
}

export default function SmartFinderPage() {
  const currentUser = auth.getCurrentUser();
  const userId = currentUser?.id;
  const queryClient = useQueryClient();
  const profilePictureUrl = useProfilePictureUrl(currentUser?.profilePictureUrl);
  
  const CHAT_STORAGE_KEY = userId ? `zorli-ai-chat-history-${userId}` : 'zorli-ai-chat-history-guest';
  
  const { data: usageData } = useQuery({
    queryKey: ['/api/subscriptions/usage'],
    enabled: auth.isAuthenticated(),
    refetchInterval: 30000,
  });

  const usage = (usageData as any)?.data as {
    filesCount: number;
    aiPromptsCount: number;
    maxFiles: number;
    maxAIPrompts: number;
  } | undefined;

  const hasReachedAILimit = usage ? (
    usage.maxAIPrompts !== -1 && usage.aiPromptsCount >= usage.maxAIPrompts
  ) : false;

  const welcomeMessage: ChatMessage = {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m Smart Finder. I can help you search through your files using natural language. Try asking me something like "Show me my driver\'s license" or "Find my recent tax documents".',
    timestamp: new Date()
  };

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingChat, setIsClearingChat] = useState(false);

  useEffect(() => {
    // Don't reload if we're currently clearing
    if (isClearing) return;
    
    const loadChatHistory = async () => {
      // First, try to load from localStorage for offline persistence
      try {
        const cachedData = localStorage.getItem(CHAT_STORAGE_KEY);
        if (cachedData) {
          const cachedMessages = JSON.parse(cachedData).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(cachedMessages);
        }
      } catch (error) {
        console.warn('Failed to load chat history from localStorage:', error);
      }

      // Then, load from database if authenticated (will replace cached data)
      if (!auth.isAuthenticated() || !userId) {
        return;
      }

      try {
        const response = await fetch('/api/chat/messages', {
          headers: auth.getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const dbMessages: ChatMessage[] = data.data
              .filter((msg: any) => msg.id !== '1')
              .map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                files: msg.files,
                timestamp: new Date(msg.timestamp)
              }));
            
            dbMessages.unshift(welcomeMessage);
            setMessages(dbMessages);
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(dbMessages));
          } else {
            // No database history, keep localStorage data or show welcome only
            if (!localStorage.getItem(CHAT_STORAGE_KEY)) {
              setMessages([welcomeMessage]);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load chat history from database:', error);
        // Keep localStorage data on error
      }
    };

    loadChatHistory();
  }, [userId, CHAT_STORAGE_KEY, isClearing])

  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const { toast } = useToast()
  const [, navigate] = useLocation()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      
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

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
    }
  }, [])

  const startRecordingTimer = () => {
    setRecordingTime(0)
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
  }

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setRecordingTime(0)
  }

  const setMaxRecordingTimeout = (stopCallback: () => void) => {
    maxRecordingTimeoutRef.current = setTimeout(() => {
      stopCallback()
    }, 60000)
  }

  const clearMaxRecordingTimeout = () => {
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current)
      maxRecordingTimeoutRef.current = null
    }
  }

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
        stopRecordingTimer()
        clearMaxRecordingTimeout()
        setIsTranscribing(true)
        setInputMessage('Transcribing, please wait...')
        await transcribeWithWhisper(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      startRecordingTimer()
      setMaxRecordingTimeout(stopAudioRecording)
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
      setInputMessage(data.text || '')
    } catch (error) {
      console.error('Transcription error:', error)
      setInputMessage('')
      toast({
        title: "Transcription failed",
        description: "Could not transcribe audio. Please try typing your message.",
        variant: "destructive",
        duration: 2300,
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      stopAudioRecording()
    } else {
      startAudioRecording()
    }
  }

  const saveChatToDatabase = useCallback(async (message: ChatMessage) => {
    if (!auth.isAuthenticated() || message.id === '1') return

    try {
      const chatMessage: InsertChatMessage = {
        userId: auth.getCurrentUser()?.id || '',
        role: message.role,
        content: message.content,
        files: message.files || null,
        timestamp: message.timestamp,
      }

      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        body: JSON.stringify(chatMessage)
      })
    } catch (error) {
      console.warn('Failed to sync chat message to database:', error)
    }
  }, [auth])

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch (error) {
      console.warn('Failed to save chat history to localStorage:', error)
    }
  }, [messages, CHAT_STORAGE_KEY])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const clearChatHistory = useCallback(async () => {
    setIsClearing(true);
    setIsClearingChat(true);
    
    const welcomeMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Smart Finder. I can help you search through your files using natural language. Try asking me something like "Show me my driver\'s license" or "Find my recent tax documents".',
      timestamp: new Date()
    }
    
    // Clear from database first
    if (auth.isAuthenticated()) {
      try {
        await fetch('/api/chat/messages', {
          method: 'DELETE',
          headers: auth.getAuthHeaders()
        })
      } catch (error) {
        console.warn('Failed to clear chat history from database:', error)
      }
    }
    
    // Then clear localStorage and state
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear chat history from localStorage:', error)
    }
    
    setMessages([welcomeMessage])
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([welcomeMessage]))
    
    // Re-enable loading after a short delay
    setTimeout(() => {
      setIsClearing(false);
      setIsClearingChat(false);
      
      toast({
        title: "Chat history cleared",
        description: "Your conversation history has been reset.",
        duration: 3000
      })
    }, 500);
  }, [CHAT_STORAGE_KEY, toast, auth])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    const originalInput = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders()
        },
        body: JSON.stringify({
          message: originalInput,
          conversation: messages.filter(m => m.id !== '1').map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      if (response.status === 403 && data.limitType === 'prompts') {
        setMessages(messages)
        queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
        
        toast({
          title: "AI prompt limit reached",
          description: data.message || "You've reached your AI prompt limit. Please upgrade to continue.",
          variant: "destructive",
          duration: 2300,
        })
        
        setTimeout(() => {
          navigate('/upgrade')
        }, 2000)
        
        return
      }

      if (!response.ok) {
        setMessages(messages)
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      saveChatToDatabase(userMessage)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        files: data.files || []
      }

      setMessages(prev => [...prev, assistantMessage])
      saveChatToDatabase(assistantMessage)
      
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
    } catch (error) {
      console.error('Chat error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from Smart Finder. Please try again.",
        variant: "destructive",
        duration: 2300,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
      duration: 2300,
    })
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      {/* Loading Overlay for Clear Chat */}
      {isClearingChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4 max-w-md">
            <Loader2 className="w-12 h-12 text-vault-500 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-vault-900 mb-2">Clearing Chat History</h3>
              <p className="text-sm text-vault-700">Please wait...</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-full max-w-5xl mx-auto">
        {/* Header */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-vault-500 rounded-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Smart Finder
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Online
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search through your files using natural language
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChatHistory}
                disabled={isClearingChat}
                data-testid="button-clear-chat"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Chat History
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-shrink-0">
                        {message.role === 'assistant' ? (
                          <div className="w-8 h-8 bg-vault-500 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-vault-500 rounded-full flex items-center justify-center overflow-hidden border-2 border-vault-500">
                            {profilePictureUrl ? (
                              <img 
                                src={profilePictureUrl} 
                                alt="Profile" 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className={`px-4 py-2 rounded-lg break-words overflow-wrap-anywhere ${
                          message.role === 'user' 
                            ? 'bg-vault-500 text-white' 
                            : 'bg-muted text-foreground'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          
                          {message.files && message.files.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.files.map((file) => (
                                <div key={file.id} className="flex items-center gap-2 p-2 bg-background/50 rounded">
                                  {file.fileType.startsWith('image/') ? (
                                    <ImageIcon className="w-4 h-4 text-blue-500" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-green-500" />
                                  )}
                                  <span className="text-xs flex-1 truncate">{file.filename}</span>
                                  {file.downloadUrl && (
                                    <a
                                      href={file.downloadUrl}
                                      download={file.filename}
                                      className="text-blue-500 hover:text-blue-700"
                                    >
                                      <Download className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-vault-500 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="px-4 py-2 bg-muted rounded-lg">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4">
              {hasReachedAILimit && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                  <Crown className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium">AI Prompt Limit Reached</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      You've used all your AI prompts. <a href="/upgrade" className="underline font-medium">Upgrade</a> to continue.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  placeholder="Ask Smart Finder anything..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading || hasReachedAILimit || isTranscribing}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                
                {speechSupported && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleVoiceInput}
                    disabled={isLoading || hasReachedAILimit || isTranscribing}
                    data-testid="button-voice-input"
                    className={isRecording ? 'bg-red-500 text-white hover:bg-red-600' : ''}
                  >
                    {isRecording ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={sendMessage}
                  disabled={isLoading || !inputMessage.trim() || hasReachedAILimit || isTranscribing}
                  data-testid="button-send-message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {isRecording && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Recording: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs">• Max 1 minute</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
