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
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Trash2,
  Mic,
  MicOff,
  Square,
  Crown
} from "lucide-react"
import { auth } from '@/lib/auth'
import { useToast } from "@/hooks/use-toast"
import type { InsertChatMessage } from '@shared/schema'
import { useLocation } from 'wouter'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useProfilePictureUrl } from '@/hooks/useProfilePictureUrl'

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

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

interface AIChatbotProps {
  onFileSelect?: (fileId: string) => void
  isOpen?: boolean
  onOpenChange?: (isOpen: boolean) => void
  initialMessage?: string | null
  onMessageSent?: () => void
}

export default function AIChatbot({ onFileSelect, isOpen: externalIsOpen, onOpenChange, initialMessage, onMessageSent }: AIChatbotProps) {
  const currentUser = auth.getCurrentUser();
  const userId = currentUser?.id;
  const queryClient = useQueryClient();
  const profilePictureUrl = useProfilePictureUrl(currentUser?.profilePictureUrl);
  
  // User-specific chat history storage key - prevents data leakage across accounts
  const CHAT_STORAGE_KEY = userId ? `zorli-ai-chat-history-${userId}` : 'zorli-ai-chat-history-guest';
  
  // Fetch user's usage data for limit checking
  const { data: usageData } = useQuery({
    queryKey: ['/api/subscriptions/usage'],
    enabled: auth.isAuthenticated(),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time data
  });

  // Get usage data for limit checking
  const usage = (usageData as any)?.data as {
    filesCount: number;
    aiPromptsCount: number;
    maxFiles: number;
    maxAIPrompts: number;
  } | undefined;

  // Check if user has reached their AI prompt limit
  const hasReachedAILimit = usage ? (
    usage.maxAIPrompts !== -1 && usage.aiPromptsCount >= usage.maxAIPrompts
  ) : false;

  // Default welcome message
  const welcomeMessage: ChatMessage = {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m Smart Finder. I can help you search through your files using natural language. Try asking me something like "Show me my driver\'s license" or "Find my recent tax documents".',
    timestamp: new Date()
  };

  // Always start with welcome message only - database will load history if it exists
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);

  // Load chat history from database when authenticated
  useEffect(() => {
    const loadFromDatabase = async () => {
      if (!auth.isAuthenticated() || !userId) {
        // Reset to welcome message only for unauthenticated users
        setMessages([welcomeMessage]);
        return;
      }

      try {
        const response = await fetch('/api/chat/messages', {
          headers: auth.getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            // Convert database messages to chat format (excluding any welcome messages that may have been stored)
            const dbMessages: ChatMessage[] = data.data
              .filter((msg: any) => msg.id !== '1') // Exclude welcome message from database
              .map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                files: msg.files,
                timestamp: new Date(msg.timestamp)
              }));
            
            // Always add welcome message at the beginning (client-side only)
            dbMessages.unshift(welcomeMessage);
            
            setMessages(dbMessages);
            // Sync to localStorage for this specific user
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(dbMessages));
          } else {
            // No history in database, show welcome message only
            setMessages([welcomeMessage]);
          }
        }
      } catch (error) {
        console.warn('Failed to load chat history from database:', error);
        // On error, reset to welcome message
        setMessages([welcomeMessage]);
      }
    };

    loadFromDatabase();
  }, [userId, CHAT_STORAGE_KEY])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Sync external isOpen state with internal minimized state
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsMinimized(!externalIsOpen)
    }
  }, [externalIsOpen])
  
  // Handle initial message from search field
  useEffect(() => {
    if (initialMessage && initialMessage.trim()) {
      // Set the input message and mark for auto-send
      setInputMessage(initialMessage)
      autoSendRef.current = true
    }
  }, [initialMessage])
  
  // Auto-send when input message is set from search field
  useEffect(() => {
    if (autoSendRef.current && inputMessage.trim()) {
      // Use a timeout to ensure the chatbot is fully open
      const timer = setTimeout(() => {
        sendMessage()
        autoSendRef.current = false
        onMessageSent?.()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [inputMessage])
  
  // Voice chat states
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'listening' | 'recording' | 'processing'>('idle')
  const [recordingTime, setRecordingTime] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const autoSendRef = useRef<boolean>(false)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const maxRecordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const { toast } = useToast()
  const [, navigate] = useLocation()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Cleanup timers and recording on unmount only
  useEffect(() => {
    isMountedRef.current = true
    
    return () => {
      isMountedRef.current = false
      
      // Stop recording if active on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop()
          // Stop all stream tracks to release microphone
          if (mediaRecorderRef.current.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
          }
        } catch (error) {
          console.error('Error stopping recording on unmount:', error)
        }
      }
      
      // Clean up timers
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (maxRecordingTimeoutRef.current) {
        clearTimeout(maxRecordingTimeoutRef.current)
      }
    }
  }, [])

  // Initialize speech recognition support - NOT USED for manual recording
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
    }
  }, [])

  // Start recording timer (1 second intervals)
  const startRecordingTimer = () => {
    setRecordingTime(0)
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1)
    }, 1000)
  }

  // Stop recording timer
  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    setRecordingTime(0)
  }

  // Set maximum recording timeout (60 seconds)
  const setMaxRecordingTimeout = (stopCallback: () => void) => {
    maxRecordingTimeoutRef.current = setTimeout(() => {
      stopCallback()
    }, 60000) // 60 seconds
  }

  // Clear maximum recording timeout
  const clearMaxRecordingTimeout = () => {
    if (maxRecordingTimeoutRef.current) {
      clearTimeout(maxRecordingTimeoutRef.current)
      maxRecordingTimeoutRef.current = null
    }
  }

  // Audio recording with manual toggle and 1-minute max
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
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Stop timers
        stopRecordingTimer()
        clearMaxRecordingTimeout()
        
        // Transcribe
        await transcribeWithWhisper(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingStatus('recording')
      
      // Start recording timer
      startRecordingTimer()
      
      // Set maximum recording timeout (auto-stop after 60 seconds)
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
      setRecordingStatus('processing')
    }
  }

  // Transcribe with OpenAI Whisper API
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
      toast({
        title: "Transcription failed",
        description: "Could not transcribe audio. Please try typing your message.",
        variant: "destructive",
        duration: 2300,
      })
    } finally {
      setRecordingStatus('idle')
    }
  }

  // Main voice input handler - Manual toggle only
  const handleVoiceInput = () => {
    if (recordingStatus !== 'idle') {
      // Stop current recording (manual toggle)
      if (isRecording) {
        stopAudioRecording()
      }
      return
    }

    // Always use audio recording with manual toggle (no auto-stop)
    startAudioRecording()
  }

  // Save new messages to database when authenticated (excluding welcome message)
  const saveChatToDatabase = useCallback(async (message: ChatMessage) => {
    if (!auth.isAuthenticated() || message.id === '1') return // Skip welcome message

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

  // Save chat history to localStorage whenever messages change
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

  // Clear chat history
  const clearChatHistory = useCallback(async () => {
    const welcomeMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Smart Finder. I can help you search through your files using natural language. Try asking me something like "Show me my driver\'s license" or "Find my recent tax documents".',
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
    
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear chat history from localStorage:', error)
    }
    
    // Clear chat history from database if authenticated
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
    
    // Immediately update localStorage to prevent UI flash
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([welcomeMessage]))
    
    toast({
      title: "Chat history cleared",
      description: "Your conversation history has been reset.",
      duration: 3000
    })
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
          conversation: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      const data = await response.json()

      // Handle limit exceeded error (403)
      if (response.status === 403 && data.limitType === 'prompts') {
        // Remove the user message from state since it wasn't allowed
        setMessages(messages)
        
        // Invalidate queries to update UI with latest usage data
        queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
        
        toast({
          title: "AI prompt limit reached",
          description: data.message || "You've reached your AI prompt limit. Please upgrade to continue.",
          variant: "destructive",
          duration: 2300,
        })
        
        // Redirect to upgrade page after a short delay using client-side navigation
        setTimeout(() => {
          navigate('/upgrade')
        }, 2000)
        
        return // Don't throw error, just return
      }

      if (!response.ok) {
        // Remove user message on other errors too
        setMessages(messages)
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      // Only save user message to database if request was successful
      saveChatToDatabase(userMessage)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        files: data.files || []
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Save assistant message to database
      saveChatToDatabase(assistantMessage)
      
      // Invalidate usage queries for instant UI updates
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

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => {
            setIsMinimized(false)
            onOpenChange?.(true)
          }}
          size="lg"
          className="rounded-full shadow-lg"
          data-testid="button-chat-expand"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Smart Finder
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col ${
      isExpanded ? 'w-[400px] h-[600px]' : 'w-[350px] h-[480px]'
    } max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-background border rounded-lg shadow-lg`} data-testid="ai-chatbot">
      
      {/* Header */}
      <div className="flex flex-row items-center justify-between p-3 border-b bg-background rounded-t-lg flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Smart Finder</h3>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Online
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChatHistory}
            data-testid="button-clear-chat"
            className="h-6 w-6 p-0"
            title="Clear chat history"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-chat-resize"
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsMinimized(true)
              onOpenChange?.(false)
            }}
            data-testid="button-chat-minimize"
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 min-w-0 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[85%] min-w-0 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                {message.role === 'user' ? (
                  profilePictureUrl ? (
                    <img 
                      src={profilePictureUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-3 h-3" />
                  )
                ) : (
                  <Bot className="w-3 h-3" />
                )}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1">
                <div
                  className={`px-3 py-2 rounded-lg text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {message.content}
                </div>
                
                {message.files && message.files.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {message.files.map((file) => (
                      <div key={file.id} className="flex items-center gap-2 p-2 bg-card border rounded text-xs">
                        {file.fileType.startsWith('image/') ? (
                          <ImageIcon className="w-3 h-3 text-blue-500" />
                        ) : (
                          <FileText className="w-3 h-3 text-green-500" />
                        )}
                        <span className="flex-1 truncate">{file.filename}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileSelect?.(file.id)}
                          data-testid={`button-view-file-${file.id}`}
                          className="h-6 w-6 p-0"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(message.content)}
                    data-testid={`button-copy-${message.id}`}
                    className="h-5 w-5 p-0"
                  >
                    <Copy className="w-2 h-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="w-3 h-3" />
            </div>
            <div className="px-3 py-2 bg-muted rounded-lg flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-sm">Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t p-3 bg-background rounded-b-lg flex-shrink-0">
        {hasReachedAILimit ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <p className="text-sm text-muted-foreground text-center">
              You've reached your AI prompt limit ({usage?.aiPromptsCount}/{usage?.maxAIPrompts})
            </p>
            <Button
              onClick={() => navigate('/upgrade')}
              size="sm"
              className="w-full"
              data-testid="button-upgrade-plan-chat"
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Your Plan
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={recordingStatus === 'listening' ? 'Listening...' : recordingStatus === 'recording' ? 'Recording...' : recordingStatus === 'processing' ? 'Processing...' : "Ask me about your files..."}
              disabled={isLoading || recordingStatus !== 'idle'}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button
              onClick={handleVoiceInput}
              disabled={isLoading}
              size="sm"
              variant={recordingStatus !== 'idle' ? 'destructive' : 'outline'}
              data-testid="button-voice-input"
              title={speechSupported ? 'Voice input (Web Speech API)' : 'Voice recording (OpenAI Whisper)'}
            >
              {recordingStatus === 'listening' ? (
                <Mic className="w-4 h-4 animate-pulse text-red-500" />
              ) : recordingStatus === 'recording' ? (
                <Square className="w-4 h-4 text-white" />
              ) : recordingStatus === 'processing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              size="sm"
              data-testid="button-send-message"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
