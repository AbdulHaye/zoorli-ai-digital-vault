import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import FileUpload from "@/components/FileUpload"
import { useQueryClient } from '@tanstack/react-query'

interface UploadModalProps {
  onUploadComplete?: (files: any[]) => void
  trigger?: React.ReactNode
}

export default function UploadModal({ onUploadComplete, trigger }: UploadModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleUploadComplete = (files: any[]) => {
    onUploadComplete?.(files)
    // Immediately invalidate all relevant queries for instant UI updates
    queryClient.invalidateQueries({ queryKey: ['files'] })
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] })
    queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/usage'] })
    setIsOpen(false) // Close modal after successful upload
  }

  const defaultTrigger = (
    <Button data-testid="button-open-upload-modal">
      <Upload className="w-4 h-4 mr-2" />
      Upload Files
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="upload-modal">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Upload and manage your files with drag-and-drop support. Files will be securely stored and analyzed by AI.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <FileUpload 
            onUploadComplete={handleUploadComplete}
            maxFiles={10}
            maxSize={50 * 1024 * 1024} // 50MB
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}