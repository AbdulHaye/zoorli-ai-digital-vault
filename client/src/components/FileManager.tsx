import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Download,
  Trash2,
  Brain,
  Clock,
  FileText,
  ImageIcon,
  AlertTriangle,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatFileSize, formatDate, isImageFile } from '@/utils'
import { cn } from '@/utils'
import { auth } from '@/lib/auth'
import type { FileRecord } from '@/types'

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'image' | 'document'

// Custom hook for reactive authentication
function useAuth() {
  const [authState, setAuthState] = useState(auth.getState())
  
  useEffect(() => {
    const unsubscribe = auth.subscribe(setAuthState)
    return unsubscribe
  }, [])
  
  return authState
}

// Authenticated Image component that handles auth headers
function AuthenticatedImage({ fileId, filename, className, onError }: {
  fileId: string
  filename: string
  className?: string
  onError?: () => void
}) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let mounted = true
    
    const loadImage = async () => {
      try {
        setLoading(true)
        setError(false)
        
        const authHeaders = auth.getAuthHeaders()
        if (!authHeaders.Authorization) {
          throw new Error('No auth token')
        }

        console.log(`Fetching preview for ${fileId} with headers:`, authHeaders)

        const response = await fetch(`/api/files/${fileId}/preview`, {
          headers: authHeaders
        })

        console.log(`Preview response for ${fileId}:`, response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Preview error for ${fileId}:`, response.status, errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const blob = await response.blob()
        if (mounted) {
          const url = URL.createObjectURL(blob)
          setImageSrc(url)
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading image for fileId:', fileId, 'Error:', err)
        if (mounted) {
          setError(true)
          setLoading(false)
          onError?.()
        }
      }
    }

    loadImage()

    return () => {
      mounted = false
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc)
      }
    }
  }, [fileId])

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700", className)}>
        <ImageIcon className="w-6 h-6 text-gray-400 animate-pulse" />
      </div>
    )
  }

  if (error || !imageSrc) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-2 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800", className)}>
        <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />
        <div className="text-xs text-red-600 dark:text-red-400 text-center font-medium">
          File not available
        </div>
        <div className="text-xs text-red-500 dark:text-red-500 text-center">
          Storage issue
        </div>
      </div>
    )
  }

  return (
    <img 
      src={imageSrc}
      alt={filename}
      className={className}
      onError={() => {
        setError(true)
        onError?.()
      }}
    />
  )
}

export default function FileManager() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<{id: string, filename: string} | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [deleteMultipleDialogOpen, setDeleteMultipleDialogOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<{id: string, filename: string} | null>(null)
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false)
  const [isDeletingSingle, setIsDeletingSingle] = useState(false)
  const queryClient = useQueryClient()

  const { user: currentUser, isAuthenticated } = useAuth()
  
  // Debug rendering and auth state
  console.log('FileManager: Rendering with auth state:', { 
    isAuthenticated, 
    currentUser, 
    userId: currentUser?.id 
  })

  // Fetch files - temporarily simplified for debugging
  const { data: filesResponse, isLoading, error } = useQuery({
    queryKey: ['files', currentUser?.id, filterType],
    queryFn: async () => {
      console.log('FileManager: Fetching files...')
      console.log('FileManager: Auth check:', { 
        isAuthenticated,
        currentUser: currentUser,
        authHeaders: auth.getAuthHeaders()
      })
      
      const response = await fetch('/api/files', {
        headers: {
          ...auth.getAuthHeaders(),
        }
      })
      
      console.log('FileManager: API response:', { 
        status: response.status, 
        ok: response.ok 
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.log('FileManager: API error:', errorText)
        throw new Error(`Failed to fetch files: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('FileManager: API data:', data)
      return data
    },
    enabled: true,  // Always enabled for debugging
    retry: false,   // Don't retry to see errors faster
  })
  
  // Log query state for debugging
  console.log('FileManager: Query state:', { 
    isLoading, 
    error: error?.message, 
    hasData: !!filesResponse 
  })

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          ...auth.getAuthHeaders(),
        }
      })
      if (!response.ok) throw new Error('Failed to delete file')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })
      toast({
        title: "File deleted",
        description: "File has been successfully deleted",
        duration: 2300,
      })
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete file",
        variant: "destructive",
        duration: 2300,
      })
    }
  })

  const files: FileRecord[] = filesResponse?.data || []

  // Filter files based on search and filter type
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.filename.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || (() => {
      if (!file.fileType) return false
      switch (filterType) {
        case 'image': return file.fileType.startsWith('image/')
        case 'document': return (
          file.fileType.includes('pdf') || 
          file.fileType.startsWith('text/') ||
          file.fileType.includes('wordprocessingml') || // DOCX
          file.fileType.includes('spreadsheetml') ||    // XLSX
          file.fileType.includes('msword') ||           // DOC
          file.fileType.includes('ms-excel') ||         // XLS
          file.fileType.includes('presentationml')      // PPTX
        )
        default: return true
      }
    })()
    
    return matchesSearch && matchesFilter
  })

  const handleDelete = (fileId: string) => {
    const file = filteredFiles.find(f => f.id === fileId)
    if (file) {
      setFileToDelete({ id: file.id, filename: file.filename })
      setDeleteDialogOpen(true)
    }
  }

  const confirmDelete = async () => {
    if (fileToDelete && !isDeletingSingle) {
      setIsDeletingSingle(true)
      try {
        await deleteMutation.mutateAsync(fileToDelete.id)
        setFileToDelete(null)
        setDeleteDialogOpen(false)
      } catch (error) {
        console.error('Error deleting file:', error)
      } finally {
        setIsDeletingSingle(false)
      }
    }
  }

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedFiles([])
    }
  }

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id))
    }
  }

  const handleDeleteSelected = () => {
    if (selectedFiles.length > 0) {
      setDeleteMultipleDialogOpen(true)
    }
  }

  const confirmDeleteMultiple = async () => {
    // Prevent duplicate calls if already deleting
    if (isDeletingMultiple) return
    
    setIsDeletingMultiple(true)
    try {
      const count = selectedFiles.length
      for (const fileId of selectedFiles) {
        await deleteMutation.mutateAsync(fileId)
      }
      setSelectedFiles([])
      setDeleteMultipleDialogOpen(false)
      toast({
        title: "Files deleted",
        description: `Successfully deleted ${count} file(s)`,
        duration: 2300,
      })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Some files could not be deleted",
        variant: "destructive",
        duration: 2300,
      })
    } finally {
      setIsDeletingMultiple(false)
    }
  }

  const handleImageClick = (fileId: string, filename: string) => {
    setPreviewImage({ id: fileId, filename })
    setImagePreviewOpen(true)
  }

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const authHeaders = auth.getAuthHeaders()
      if (!authHeaders.Authorization) {
        toast({
          title: "Authentication required",
          description: "Please sign in to download files",
          variant: "destructive",
          duration: 2300,
        })
        return
      }

      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: authHeaders
      })

      if (!response.ok) {
        throw new Error('Download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
        duration: 2300,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
        duration: 2300,
      })
    }
  }

  const getFileTypeIcon = (file_type: string) => {
    if (!file_type) return '📁'
    if (file_type.startsWith('image/')) return '🖼️'
    if (file_type.startsWith('video/')) return '🎥'
    if (file_type.startsWith('audio/')) return '🎵'
    if (file_type.includes('pdf')) return '📄'
    if (file_type.startsWith('text/')) return '📝'
    return '📁'
  }

  if (isLoading) {
    return (
      <Card data-testid="file-manager-loading">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading files...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 relative" data-testid="file-manager">
      {/* Loading Overlay for File Deletion */}
      {(isDeletingMultiple || isDeletingSingle) && (
        <div 
          className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg"
          data-testid="delete-loading-overlay"
        >
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-lg font-medium text-foreground">
            {isDeletingMultiple ? 'Deleting files, please wait...' : 'Deleting file, please wait...'}
          </p>
        </div>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              File Manager
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectedFiles.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={isDeletingMultiple}
                  data-testid="button-delete-selected"
                >
                  {isDeletingMultiple ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedFiles.length})
                    </>
                  )}
                </Button>
              )}
              <Badge variant="secondary" data-testid="file-count">
                {filteredFiles.length} files
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Select Button */}
            {filteredFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleSelectionMode}
                  data-testid="button-select"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select
                </Button>
                {selectionMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    data-testid="button-select-all"
                  >
                    {selectedFiles.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            )}
            
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>

            {/* Filter */}
            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]" data-testid="filter-select">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle */}
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                data-testid="view-grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="view-list"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card data-testid="no-files">
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload some files to get started'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
        )}>
          {filteredFiles.map(file => (
            <Card 
              key={file.id} 
              className="hover-elevate"
              data-testid={`file-card-${file.id}`}
            >
              {viewMode === 'grid' ? (
                <CardContent className="p-4">
                  {/* Checkbox */}
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        data-testid={`checkbox-file-${file.id}`}
                      />
                    </div>
                  )}

                  {/* Thumbnail/Icon */}
                  <div 
                    className={cn(
                      "aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center text-2xl relative overflow-hidden",
                      isImageFile(file.fileType) && "cursor-pointer hover:opacity-80 transition-opacity"
                    )}
                    onClick={() => {
                      if (isImageFile(file.fileType) && !selectionMode) {
                        handleImageClick(file.id, file.filename)
                      }
                    }}
                  >
                    {isImageFile(file.fileType) ? (
                      <AuthenticatedImage 
                        fileId={file.id}
                        filename={file.filename}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      getFileTypeIcon(file.fileType)
                    )}
                  </div>

                  {/* File Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm truncate" title={file.filename}>
                      {file.filename}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(file.fileSize)}</span>
                      {file.aiProcessed && (
                        <Badge variant="secondary" className="text-xs">
                          <Brain className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(file.createdAt!)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 mt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDownload(file.id, file.filename)}
                      data-testid={`button-download-${file.id}`}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${file.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    {selectionMode && (
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => toggleFileSelection(file.id)}
                        data-testid={`checkbox-file-${file.id}`}
                      />
                    )}

                    {/* Icon/Thumbnail */}
                    <div 
                      className={cn(
                        "w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
                        isImageFile(file.fileType) && "cursor-pointer hover:opacity-80 transition-opacity"
                      )}
                      onClick={() => {
                        if (isImageFile(file.fileType) && !selectionMode) {
                          handleImageClick(file.id, file.filename)
                        }
                      }}
                    >
                      {isImageFile(file.fileType) ? (
                        <AuthenticatedImage 
                          fileId={file.id}
                          filename={file.filename}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        getFileTypeIcon(file.fileType)
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{file.filename}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>{formatDate(file.createdAt!)}</span>
                        {file.aiProcessed && (
                          <Badge variant="secondary" className="text-xs">
                            <Brain className="w-3 h-3 mr-1" />
                            AI Processed
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(file.id, file.filename)}
                        data-testid={`button-download-${file.id}`}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialogOpen} 
        onOpenChange={(open) => {
          if (!isDeletingSingle) {
            setDeleteDialogOpen(open)
            if (!open) setFileToDelete(null)
          }
        }}
      >
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {fileToDelete ? `"${fileToDelete.filename}"` : 'this file'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              data-testid="button-cancel-delete"
              onClick={() => setFileToDelete(null)}
              disabled={isDeletingSingle}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={isDeletingSingle}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {isDeletingSingle ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Multiple Files Confirmation Dialog */}
      <AlertDialog 
        open={deleteMultipleDialogOpen} 
        onOpenChange={(open) => {
          if (!isDeletingMultiple) {
            setDeleteMultipleDialogOpen(open)
          }
        }}
      >
        <AlertDialogContent data-testid="delete-multiple-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Files</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedFiles.length} selected file(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isDeletingMultiple}
              data-testid="button-cancel-delete-multiple"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMultiple}
              disabled={isDeletingMultiple}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-multiple"
            >
              {isDeletingMultiple ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                `Delete ${selectedFiles.length} Files`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewImage?.filename}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted rounded-lg p-4 max-h-[75vh] overflow-auto">
            {previewImage && (
              <AuthenticatedImage 
                fileId={previewImage.id}
                filename={previewImage.filename}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}