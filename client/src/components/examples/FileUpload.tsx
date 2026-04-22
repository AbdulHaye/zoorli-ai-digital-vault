import FileUpload from '../FileUpload'

export default function FileUploadExample() {
  const handleUploadComplete = (files: any[]) => {
    console.log('Upload completed:', files)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">File Upload Demo</h2>
      <FileUpload 
        onUploadComplete={handleUploadComplete}
        maxFiles={5}
        maxSize={10 * 1024 * 1024} // 10MB for demo
      />
    </div>
  )
}