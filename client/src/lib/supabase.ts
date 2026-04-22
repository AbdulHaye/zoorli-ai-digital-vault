import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// For client-side usage
export const supabase = createClientComponentClient()

// For server-side usage with direct database connection
export const createSupabaseServerClient = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required')
  }
  
  // Parse DATABASE_URL to get Supabase URL and anon key
  // This is a simplified version - you may need to adjust based on your actual Supabase setup
  const dbUrl = new URL(process.env.DATABASE_URL)
  const supabaseUrl = `https://${dbUrl.hostname.split('.')[0]}.supabase.co`
  
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '')
}

// Types for database tables - Updated for Supabase RAG schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          username: string | null
          created_at: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          username?: string | null
          created_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          username?: string | null
          created_at?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_size: number
          file_type: string
          storage_path: string
          download_url: string | null
          embeddings: any[] | null
          text_content: string | null
          embedding_status: string | null
          is_shared: boolean | null
          share_token: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_size: number
          file_type: string
          storage_path: string
          download_url?: string | null
          embeddings?: any[] | null
          text_content?: string | null
          embedding_status?: string | null
          is_shared?: boolean | null
          share_token?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_size?: number
          file_type?: string
          storage_path?: string
          download_url?: string | null
          embeddings?: any[] | null
          text_content?: string | null
          embedding_status?: string | null
          is_shared?: boolean | null
          share_token?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          job_type: string
          status: string
          data: any
          result: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_type: string
          status: string
          data: any
          result?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_type?: string
          status?: string
          data?: any
          result?: any | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}