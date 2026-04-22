import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { toast } from '@/hooks/use-toast'
import { 
  FileText, 
  Image, 
  Video, 
  Music, 
  File, 
  Eye, 
  Edit3, 
  Trash2, 
  Download,
  Search,
  Calendar,
  HardDrive
} from 'lucide-react'
import { formatFileSize, formatDate } from '@/utils'
import { auth } from '@/lib/auth'

interface FileRecord {
  id: string
  userId: string
  filename: string
  fileSize: number
  fileType: string
  storagePath: string
  aiProcessed: boolean
  aiAnalysis: any
  createdAt: string
  updatedAt: string
}

interface FilePreviewProps {
  onFileAction?: (action: 'edit' | 'preview' | 'delete', file: FileRecord) => void
}

export default function FilePreview({ onFileAction }: FilePreviewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null)
  const [newFilename, setNewFilename] = useState('')
  const queryClient = useQueryClient()

  const currentUser = auth.getCurrentUser()

  // Fetch files
  const { data: filesResponse, isLoading } = useQuery({
    queryKey: ['files', currentUser?.id],
    queryFn: async () => {
      if (!auth.isAuthenticated()) {
        throw new Error('Not authenticated')
      }
      
      const response = await fetch('/api/files', {
        headers: {
          ...auth.getAuthHeaders(),
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`)
      }
      
      return response.json()
    },
    enabled: !!currentUser,
    refetchInterval: 30000 // Refresh every 30 seconds
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

  // Update file mutation (for editing filename)
  const updateMutation = useMutation({
    mutationFn: async ({ fileId, filename }: { fileId: string; filename: string }) => {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...auth.getAuthHeaders(),
        },
        body: JSON.stringify({ filename })
      })
      if (!response.ok) throw new Error('Failed to update file')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      setEditingFile(null)
      setNewFilename('')
      toast({
        title: "File updated",
        description: "Filename has been successfully updated",
        duration: 2300,
      })
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update file",
        variant: "destructive",
        duration: 2300,
      })
    }
  })

  const files: FileRecord[] = filesResponse?.data || []
  
  // Filter files based on search
  const filteredFiles = files.filter(file => 
    file.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />
    if (fileType.startsWith('audio/')) return <Music className="w-5 h-5 text-green-500" />
    if (fileType.includes('pdf') || fileType.startsWith('text/')) return <FileText className="w-5 h-5 text-red-500" />
    return <File className="w-5 h-5 text-gray-500" />
  }

  const handleDelete = (file: FileRecord) => {
    deleteMutation.mutate(file.id)
    onFileAction?.('delete', file)
  }

  const handleEdit = (file: FileRecord) => {
    setEditingFile(file)
    setNewFilename(file.filename)
    onFileAction?.('edit', file)
  }

  const handleSaveEdit = () => {
    if (editingFile && newFilename.trim()) {
      updateMutation.mutate({ 
        fileId: editingFile.id, 
        filename: newFilename.trim() 
      })
    }
  }

  const handlePreview = (file: FileRecord) => {
    setSelectedFile(file)
    onFileAction?.('preview', file)
  }

  const handleDownload = (file: FileRecord) => {
    // For now, just show a toast. In a real app, this would trigger a download
    toast({
      title: "Download initiated",
      description: `Downloading ${file.filename}...`,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading files...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" data-testid="file-preview">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Files
              </CardTitle>
              <CardDescription>
                Manage and preview your uploaded files
              </CardDescription>
            </div>
            <Badge variant="secondary" data-testid="file-count">
              {filteredFiles.length} files
            </Badge>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-files"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Files Grid */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search term' : 'Upload your first file to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover-elevate" data-testid={`file-card-${file.id}`}>
              <CardContent className="p-4">
                {/* File Info */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 mt-1">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate" title={file.filename}>
                      {file.filename}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <HardDrive className="w-3 h-3" />
                      {formatFileSize(file.fileSize)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(file.createdAt)}
                    </div>
                  </div>
                </div>

                {/* AI Status */}
                <div className="mb-3">
                  <Badge 
                    variant={file.aiProcessed ? "default" : "secondary"} 
                    className="text-xs"
                    data-testid={`ai-status-${file.id}`}
                  >
                    {file.aiProcessed ? "AI Processed" : "Processing..."}
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1">
                  {/* Preview */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handlePreview(file)}
                        data-testid={`button-preview-${file.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" data-testid="file-preview-modal">
                      <DialogHeader>
                        <DialogTitle>{selectedFile?.filename}</DialogTitle>
                        <DialogDescription>
                          File details and AI analysis results
                        </DialogDescription>
                      </DialogHeader>
                      {selectedFile && (
                        <div className="space-y-4">
                          {/* Image Preview */}
                          {selectedFile.file_type.startsWith('image/') && (
                            <div className="flex justify-center bg-muted rounded-lg p-4">
                              <img
                                src={selectedFile.url || `/api/files/${selectedFile.id}/download`}
                                alt={selectedFile.filename}
                                className="max-w-full max-h-96 object-contain rounded-md"
                                data-testid={`preview-image-${selectedFile.id}`}
                                onError={(e) => {
                                  // Fallback to placeholder if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const placeholder = target.nextElementSibling as HTMLElement;
                                  if (placeholder) placeholder.style.display = 'block';
                                }}
                              />
                              <div 
                                className="hidden p-8 text-center text-muted-foreground"
                                data-testid={`preview-placeholder-${selectedFile.id}`}
                              >
                                <div className="text-lg mb-2">📷</div>
                                <div>Image preview not available</div>
                                <div className="text-sm mt-1">File: {selectedFile.filename}</div>
                              </div>
                            </div>
                          )}
                          
                          {/* File Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Size:</strong> {formatFileSize(selectedFile.fileSize)}
                            </div>
                            <div>
                              <strong>Type:</strong> {selectedFile.file_type}
                            </div>
                            <div>
                              <strong>Uploaded:</strong> {formatDate(selectedFile.createdAt)}
                            </div>
                            <div>
                              <strong>AI Status:</strong> {selectedFile.aiProcessed ? "Processed" : "Processing"}
                            </div>
                          </div>
                          
                          {/* AI Analysis */}
                          {selectedFile.aiAnalysis && (
                            <div>
                              <strong>AI Analysis:</strong>
                              <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto">
                                {JSON.stringify(selectedFile.aiAnalysis, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Edit */}
                  <Dialog open={editingFile?.id === file.id} onOpenChange={(open) => !open && setEditingFile(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(file)}
                        data-testid={`button-edit-${file.id}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid="edit-file-modal">
                      <DialogHeader>
                        <DialogTitle>Edit File</DialogTitle>
                        <DialogDescription>
                          Update the filename for this file
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Filename</label>
                          <Input
                            value={newFilename}
                            onChange={(e) => setNewFilename(e.target.value)}
                            placeholder="Enter new filename"
                            data-testid="edit-filename-input"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingFile(null)}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                            data-testid="button-save-edit"
                          >
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Download */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDownload(file)}
                    data-testid={`button-download-${file.id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        data-testid={`button-delete-${file.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent data-testid="delete-confirm-modal">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete File</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{file.filename}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(file)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-delete"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
