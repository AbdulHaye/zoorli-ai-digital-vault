// User types
export interface User {
  id: string
  email: string | null
  username: string | null
  created_at: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export interface CreateUser {
  email: string
  username: string
  password: string
}

// File types
export interface FileRecord {
  id: string
  userId: string
  filename: string
  fileSize: number
  fileType: string
  storagePath: string
  aiProcessed: boolean
  createdAt: string
  updatedAt: string
  aiAnalysis?: AIAnalysisResult
}

export interface UploadedFile {
  file: File
  preview?: string
  progress?: number
  status?: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  id?: string
}

// AI types
export interface AIAnalysisResult {
  summary: string
  sentiment: {
    rating: number
    confidence: number
  }
  tags: string[]
  category: string
}

export interface ImageAnalysisResult {
  description: string
  objects: string[]
  scene: string
  text_content?: string
}

// Job types
export interface JobRecord {
  id: string
  user_id: string
  job_type: string
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled'
  data: any
  result: any | null
  progress?: number
  created_at: string
  updated_at: string
  error?: string
}

export type JobType = 
  | 'file_processing'
  | 'ai_analysis' 
  | 'image_generation'
  | 'audio_transcription'
  | 'email_notification'
  | 'cleanup_temp_files'

// Payment types
export interface PaymentIntent {
  id: string
  client_secret: string
  amount: number
  currency: string
  status: string
}

export interface Subscription {
  id: string
  customer_id: string
  status: string
  current_period_start: number
  current_period_end: number
  client_secret?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// UI State types
export interface UploadState {
  files: UploadedFile[]
  isUploading: boolean
  progress: number
  error?: string
}

export interface DashboardStats {
  totalFiles: number
  totalStorage: number
  aiProcessed: number
  activeJobs: number
  subscriptionStatus?: string
}

// Filter and sort types
export interface FileFilters {
  fileType?: string
  processed?: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  search?: string
}

export interface SortOptions {
  field: 'created_at' | 'filename' | 'file_size' | 'file_type'
  direction: 'asc' | 'desc'
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}