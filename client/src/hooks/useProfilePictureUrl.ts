import { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'

export function useProfilePictureUrl(storagePath: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSignedUrl() {
      if (!storagePath) {
        setSignedUrl(null)
        return
      }

      // If it's a storage path (starts with users/), fetch signed URL
      if (storagePath.startsWith('users/')) {
        try {
          const response = await fetch('/api/storage/signed-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...auth.getAuthHeaders(),
            },
            body: JSON.stringify({ storagePath }),
          })

          const result = await response.json()
          
          if (result.success && result.data?.signedUrl) {
            setSignedUrl(result.data.signedUrl)
          } else {
            setSignedUrl(null)
          }
        } catch (error) {
          console.error('Error fetching signed URL:', error)
          setSignedUrl(null)
        }
      } else {
        // Legacy format - use as-is
        setSignedUrl(storagePath)
      }
    }

    fetchSignedUrl()
  }, [storagePath])

  return signedUrl
}
