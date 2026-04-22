import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export class SupabaseStorageService {
  private bucketName = 'documents'

  constructor() {
    this.ensureBucketExists()
  }

  private async ensureBucketExists() {
    try {
      const { data, error } = await supabase.storage.getBucket(this.bucketName)
      
      if (error && error.message.includes('not found')) {
        // Create bucket if it doesn't exist - allow all file types
        await supabase.storage.createBucket(this.bucketName, {
          public: false,
          fileSizeLimit: 52428800 // 50MB, no MIME type restrictions
        })
        console.log('Created storage bucket (all file types allowed)')
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error)
    }
  }

  async uploadFile(filePath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType,
          upsert: false
        })

      if (error) {
        throw new Error(`Supabase Storage upload failed: ${error.message}`)
      }

      return data.path
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }

  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn)

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`)
      }

      return data.signedUrl
    } catch (error) {
      console.error('Signed URL generation error:', error)
      throw error
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath])

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`)
      }
    } catch (error) {
      console.error('File deletion error:', error)
      throw error
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(filePath)

      if (error) {
        throw new Error(`Failed to download file: ${error.message}`)
      }

      return Buffer.from(await data.arrayBuffer())
    } catch (error) {
      console.error('File download error:', error)
      throw error
    }
  }
}

export { supabase as supabaseServer }