import { useState, useRef, useCallback, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText, 
  X,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { formatFileSize, getFileIcon, isImageFile, createFilePreview } from '@/utils'
import { cn } from '@/utils'
import { auth } from '@/lib/auth'
import { useLocation } from 'wouter'

interface UploadFile {
  file: File
  id: string
  preview?: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface FileUploadProps {
  onUploadComplete?: (files: any[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
  acceptedTypes?: string[]
}

export default function FileUpload({
  onUploadComplete,
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = [
    // Images (with OCR support)
    'image/*',
    // Text files
    'text/*',
    // PDF files
    'application/pdf',
    // Office documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/vnd.ms-excel', // .xls (legacy Excel)
  ]
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const queryClient = useQueryClient()
  const [, navigate] = useLocation()

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current)
      }
    }
  }, [])

  const getFileIconComponent = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-4 h-4" />
    if (fileType.startsWith('video/')) return <Video className="w-4 h-4" />
    if (fileType.startsWith('audio/')) return <Music className="w-4 h-4" />
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4" />
    if (fileType.startsWith('text/')) return <FileText className="w-4 h-4" />
    if (fileType.includes('wordprocessingml') || fileType.includes('msword')) return <FileText className="w-4 h-4" />
    if (fileType.includes('spreadsheetml') || fileType.includes('excel')) return <FileText className="w-4 h-4" />
    if (fileType.includes('presentationml') || fileType.includes('powerpoint')) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)} limit`
    }
    
    const isTypeAccepted = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1))
      }
      return file.type === type
    })
    
    if (!isTypeAccepted) {
      return 'File type not supported'
    }
    
    return null
  }

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles)
    
    if (files.length + fileArray.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} files allowed`,
        variant: "destructive",
        duration: 2300,
      })
      return
    }

    const validFiles: UploadFile[] = []

    for (const file of fileArray) {
      const error = validateFile(file)
      if (error) {
        toast({
          title: "Invalid file",
          description: `${file.name}: ${error}`,
          variant: "destructive",
        })
        continue
      }

      const uploadFile: UploadFile = {
        file,
        id: Math.random().toString(36).substring(2) + Date.now().toString(36),
        progress: 0,
        status: 'pending'
      }

      // Create preview for images
      if (isImageFile(file.type)) {
        try {
          uploadFile.preview = await createFilePreview(file)
        } catch (error) {
          console.log('Could not create preview for', file.name)
        }
      }

      validFiles.push(uploadFile)
    }

    setFiles(prev => [...prev, ...validFiles])
  }, [files.length, maxFiles, maxSize, acceptedTypes])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    // Clear any existing timeout to prevent premature overlay hiding
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current)
      overlayTimeoutRef.current = null
    }

    setIsUploading(true)
    setShowOverlay(true)

    try {
      // Check authentication
      const isAuthenticated = auth.isAuthenticated()
      const currentUser = auth.getCurrentUser()
      const authHeaders = auth.getAuthHeaders()
      console.log('FileUpload auth check:', { isAuthenticated, currentUser, authHeaders })
      console.log('localStorage auth_token:', localStorage.getItem('auth_token'))
      
      if (!isAuthenticated) {
        throw new Error('Please log in to upload files')
      }

      const formData = new FormData()
      pendingFiles.forEach(uploadFile => {
        formData.append('files', uploadFile.file)
      })

      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
      ))

      // Use XMLHttpRequest for real upload progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100
            setFiles(prev => prev.map(f => 
              f.status === 'uploading' 
                ? { ...f, progress: Math.min(percentComplete, 95) } // Cap at 95% until complete
                : f
            ))
          }
        })
        
        xhr.addEventListener('load', () => {
          // Always resolve with response, don't reject on non-2xx
          // This allows us to handle 403 errors properly
          resolve(new Response(xhr.responseText, {
            status: xhr.status,
            headers: { 'Content-Type': 'application/json' }
          }))
        })
        
        xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
        xhr.addEventListener('abort', () => reject(new Error('Upload was cancelled')))
        
        // Open and send request
        xhr.open('POST', '/api/files/upload')
        
        // Set auth headers
        const authHeaders = auth.getAuthHeaders()
        Object.entries(authHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
        })
        
        xhr.send(formData)
      })

      const result = await response.json()

      // Handle limit exceeded error (403)
      if (response.status === 403 && result.limitType === 'files') {
        // Invalidate queries to update UI with latest usage data
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
        queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })
        
        toast({
          title: "File upload limit reached",
          description: result.message || "You've reached your file upload limit. Please upgrade to continue.",
          variant: "destructive",
        })
        
        // Redirect to upgrade page after a short delay using client-side navigation
        setTimeout(() => {
          navigate('/upgrade')
        }, 2000)
        
        throw new Error(result.message || 'Upload limit exceeded')
      }

      if (!response.ok) {
        throw new Error(result.error || `Upload failed: ${response.statusText}`)
      }

      if (result.success) {
        // Mark all as completed
        setFiles(prev => prev.map(f => 
          f.status === 'uploading' 
            ? { ...f, status: 'completed' as const, progress: 100 }
            : f
        ))

        // Invalidate files cache to refresh FileManager
        // Use wildcard pattern to match FileManager's query key structure: ['files', userId, filterType]
        queryClient.invalidateQueries({ 
          queryKey: ['files'],
          exact: false  // This will invalidate all queries starting with ['files']
        })

        // Invalidate usage stats queries to update dashboard metrics immediately
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
        queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })

        toast({
          title: "Upload successful",
          description: `${pendingFiles.length} file(s) uploaded successfully`,
        })

        onUploadComplete?.(result.data)
      } else {
        throw new Error(result.error || 'Upload failed')
      }

    } catch (error) {
      console.error('Upload error:', error)
      
      // Mark as error
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ))

      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: "destructive",
        duration: 2300,
      })
    } finally {
      setIsUploading(false)
      // Delay hiding overlay to allow fade-out animation
      overlayTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false)
        overlayTimeoutRef.current = null
      }, 300) // Match the transition duration
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles)
    }
  }, [addFiles])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles)
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'))
  }

  return (
    <div className="space-y-4 relative" data-testid="file-upload">
      {/* Loading Overlay */}
      {showOverlay && (
        <div 
          className={cn(
            "absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg transition-opacity duration-300",
            isUploading ? "opacity-100" : "opacity-0"
          )}
          data-testid="upload-loading-overlay"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-lg font-medium text-foreground">Uploading your file, please wait...</p>
        </div>
      )}

      {/* Upload Area */}
      <Card 
        className={cn(
          "transition-colors duration-200 cursor-pointer hover-elevate",
          isDragging && "border-primary bg-primary/5",
          files.length === 0 && "border-dashed border-2",
          isUploading && "pointer-events-none opacity-60"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        data-testid="upload-area"
      >
        <CardContent className="p-8 text-center">
          <Upload className={cn(
            "w-12 h-12 mx-auto mb-4 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )} />
          <h3 className="text-lg font-semibold mb-2">
            {isDragging ? "Drop files here" : "Upload Files"}
          </h3>
          <p className="text-muted-foreground mb-1">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Maximum file size: 50MB
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="secondary">Images</Badge>
            <Badge variant="secondary">Documents</Badge>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
            data-testid="file-input"
          />
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card data-testid="file-list">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Files ({files.length})</h4>
              <div className="flex gap-2">
                {files.some(f => f.status === 'completed') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearCompleted}
                    data-testid="button-clear-completed"
                  >
                    Clear Completed
                  </Button>
                )}
                {files.some(f => f.status === 'pending') && (
                  <Button 
                    onClick={uploadFiles} 
                    disabled={isUploading}
                    data-testid="button-upload"
                  >
                    {isUploading ? 'Uploading...' : `Upload ${files.filter(f => f.status === 'pending').length} Files`}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {files.map(uploadFile => (
                <div 
                  key={uploadFile.id} 
                  className="flex items-center gap-3 p-3 border rounded-lg"
                  data-testid={`file-item-${uploadFile.status}`}
                >
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {uploadFile.preview ? (
                      <img 
                        src={uploadFile.preview} 
                        alt={uploadFile.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                        {getFileIconComponent(uploadFile.file.type)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type || 'Unknown type'}
                    </p>
                  </div>

                  {/* Progress/Status */}
                  <div className="flex items-center gap-2">
                    {uploadFile.status === 'uploading' && (
                      <div className="w-24">
                        <Progress value={uploadFile.progress} className="h-2" />
                      </div>
                    )}
                    
                    {uploadFile.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" data-testid="upload-success" />
                    )}
                    
                    {uploadFile.status === 'error' && (
                      <AlertCircle 
                        className="w-5 h-5 text-destructive" 
                        data-testid="upload-error"
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={uploadFile.status === 'uploading'}
                      data-testid={`button-remove-${uploadFile.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
