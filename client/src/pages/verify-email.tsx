import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'wouter'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VerifyEmail() {
  const [, navigate] = useLocation()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email...')
  const verificationAttempted = useRef(false)

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevent duplicate verification attempts
      if (verificationAttempted.current) {
        return
      }
      verificationAttempted.current = true
      try {
        // Get token from URL query params
        const params = new URLSearchParams(window.location.search)
        const token = params.get('token')

        if (!token) {
          setStatus('error')
          setMessage('Missing verification token')
          return
        }

        // Call verification endpoint
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          setStatus('error')
          setMessage(data.error || 'Failed to verify email')
          return
        }

        // Successfully verified - auto login with the token
        const { user, token: authToken } = data.data
        auth.login(user, authToken)

        setStatus('success')
        setMessage('Email verified successfully! Redirecting to dashboard...')

        // Redirect IMMEDIATELY to prevent duplicate verification attempts
        navigate('/dashboard')

      } catch (error) {
        console.error('Verification error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred. Please try again.')
      }
    }

    verifyEmail()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
          <CardDescription>Please wait while we verify your email address</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-center text-muted-foreground">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-600" />
              <p className="text-center font-medium text-green-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <p className="text-center font-medium text-destructive">{message}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => navigate('/signin')} variant="outline">
                  Sign In
                </Button>
                <Button onClick={() => navigate('/signup')}>
                  Sign Up Again
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
