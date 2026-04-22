import { useState, useEffect } from 'react'
import { useLocation } from 'wouter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Brain, 
  Shield,
  Zap,
  Cloud,
  BarChart3,
  Users,
  ArrowRight,
  Check,
  Key,
  Lock
} from "lucide-react"
import SignUpForm from '@/components/auth/SignUpForm'
import SignInForm from '@/components/auth/SignInForm'
import AnimatedCounter from '@/components/AnimatedCounter'
import { auth } from '@/lib/auth'
import vaultLogo from '@assets/generated_images/zorli-vault-logo.png'

export default function Home() {
  const [, navigate] = useLocation()
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null)
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null)

  // Handle navigation in useEffect to avoid updates during render
  useEffect(() => {
    if (pendingRedirect) {
      console.log('Navigating to:', pendingRedirect)
      navigate(pendingRedirect)
      setPendingRedirect(null)
    }
  }, [pendingRedirect, navigate])

  const handleAuthSuccess = (data?: any) => {
    console.log('handleAuthSuccess called with data:', data)
    if (data) {
      // Update auth state if user data is provided
      // data can be either {user, token} from signin or just user from signup
      if (data.user && data.token) {
        console.log('Calling auth.login with user and token')
        auth.login(data.user, data.token)
      } else if (data.user) {
        console.log('Calling auth.login with user only')
        auth.login(data.user)
      } else {
        console.log('Calling auth.login with fallback data')
        auth.login(data) // fallback for direct user object
      }
    }
    
    // Check user role and redirect accordingly
    let user = null;
    if (data?.user) {
      user = data.user;
    } else if (data) {
      user = data; // fallback for direct user object
    }
    
    // Redirect admin users to admin dashboard, regular users to main dashboard
    if (user?.role === 'admin') {
      console.log('Admin user detected, scheduling redirect to /admin')
      setPendingRedirect('/admin')
    } else {
      console.log('Regular user, scheduling redirect to /dashboard')
      setPendingRedirect('/dashboard')
    }
  }

  const handleShowSignIn = () => setAuthMode('signin')
  const handleShowSignUp = () => setAuthMode('signup')
  const handleBackToHome = () => setAuthMode(null)

  // Show authentication forms
  if (authMode === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <button 
              onClick={handleBackToHome}
              className="text-2xl font-bold hover:opacity-80 transition-opacity"
              style={{ color: '#2B6CB0' }}
            >
              Zorli AI Vault
            </button>
          </div>
          <SignInForm 
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={handleShowSignUp}
          />
        </div>
      </div>
    )
  }

  if (authMode === 'signup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <button 
              onClick={handleBackToHome}
              className="text-2xl font-bold hover:opacity-80 transition-opacity"
              style={{ color: '#2B6CB0' }}
            >
              Zorli AI Vault
            </button>
          </div>
          <SignUpForm 
            onSuccess={handleAuthSuccess}
            onSwitchToSignIn={handleShowSignIn}
          />
        </div>
      </div>
    )
  }

  // Landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={vaultLogo} 
              alt="Zorli AI Vault Logo" 
              className="w-10 h-10 rounded-lg object-cover"
            />
            <h1 className="text-2xl font-bold" style={{ color: '#2B6CB0' }}>
              Zorli AI Vault
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={handleShowSignIn}
              data-testid="button-signin-header"
            >
              Sign In
            </Button>
            <Button 
              onClick={handleShowSignUp}
              data-testid="button-signup-header"
            >
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-8 pb-2 leading-normal bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
              Secure AI-Powered File Management
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Upload, analyze, and manage your files with cutting-edge AI technology. 
              Get instant insights, smart categorization, and secure cloud storage.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg"
                onClick={handleShowSignUp}
                data-testid="button-signup-hero"
              >
                Sign Up
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-6 text-lg"
                onClick={handleShowSignIn}
                data-testid="button-signin-hero"
              >
                Sign In
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary" className="px-3 py-1" data-testid="badge-feature-ai">
                <Brain className="w-4 h-4 mr-1" />
                AI-Powered Analysis
              </Badge>
              <Badge variant="secondary" className="px-3 py-1" data-testid="badge-feature-secure">
                <Shield className="w-4 h-4 mr-1" />
                Bank-Level Security
              </Badge>
              <Badge variant="secondary" className="px-3 py-1" data-testid="badge-feature-cloud">
                <Cloud className="w-4 h-4 mr-1" />
                Cloud Storage
              </Badge>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover-elevate border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">AI-Powered Analysis</h3>
              <p className="text-muted-foreground leading-relaxed">
                Get instant insights from your files with advanced AI analysis. 
                Automatic categorization, sentiment analysis, and content extraction.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover-elevate border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Enterprise Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                Bank-level encryption and security protocols. Your files are protected with 
                industry-standard security measures and access controls.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover-elevate border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Lightning Fast</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload and process files at incredible speeds with our optimized infrastructure. 
                Real-time progress tracking and instant results.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <AnimatedCounter 
              end={10000} 
              suffix="+" 
              className="text-3xl font-bold text-primary mb-2"
              duration={2500}
            />
            <div className="text-muted-foreground">Files Processed</div>
          </div>
          <div className="text-center">
            <AnimatedCounter 
              end={99.9} 
              suffix="%" 
              decimals={1}
              className="text-3xl font-bold text-primary mb-2"
              duration={2500}
            />
            <div className="text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center">
            <AnimatedCounter 
              end={500} 
              suffix="+" 
              className="text-3xl font-bold text-primary mb-2"
              duration={2500}
            />
            <div className="text-muted-foreground">Happy Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">24/7</div>
            <div className="text-muted-foreground">Support</div>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground mb-12">Get started in three simple steps</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Upload Your Files</h3>
              <p className="text-muted-foreground">
                Simply drag and drop your files or click to upload. 
                Support for all major file types and formats.
              </p>
            </div>
            
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI automatically analyzes your files, extracting insights, 
                categorizing content, and generating summaries.
              </p>
            </div>
            
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Get Insights</h3>
              <p className="text-muted-foreground">
                View detailed analytics, search through content, and 
                discover patterns in your data with powerful visualizations.
              </p>
            </div>
          </div>
        </div>

        {/* Password Vault Feature Highlight */}
        <div className="mb-16">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="text-center md:text-left">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Secure Password Vault
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    Never forget a password again. Store all your credentials in one secure, 
                    encrypted vault with military-grade AES-256-GCM encryption.
                  </p>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-1" />
                      <span className="text-left">AES-256-GCM encryption for maximum security</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-1" />
                      <span className="text-left">Store unlimited passwords and credentials</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-1" />
                      <span className="text-left">Access from anywhere, anytime</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary shrink-0 mt-1" />
                      <span className="text-left">Batch management and secure deletion</span>
                    </div>
                  </div>
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={handleShowSignUp}
                  >
                    <Key className="w-5 h-5" />
                    Start Using Vault
                  </Button>
                </div>
                <div className="hidden md:block">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl"></div>
                    <div className="relative bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-primary/10">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl">
                          <Key className="w-6 h-6 text-purple-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-sm">Email Account</div>
                            <div className="text-xs text-muted-foreground">user@example.com</div>
                          </div>
                          <Lock className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl">
                          <Key className="w-6 h-6 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-sm">Banking Portal</div>
                            <div className="text-xs text-muted-foreground">secure-bank.com</div>
                          </div>
                          <Lock className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl">
                          <Key className="w-6 h-6 text-green-600" />
                          <div className="flex-1">
                            <div className="font-semibold text-sm">Social Media</div>
                            <div className="text-xs text-muted-foreground">twitter.com</div>
                          </div>
                          <Lock className="w-4 h-4 text-green-600" />
                        </div>
                      </div>
                      <div className="mt-6 text-center text-xs text-muted-foreground">
                        <Shield className="w-4 h-4 inline mr-1" />
                        Protected with AES-256-GCM Encryption
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Section */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-xl text-muted-foreground mb-12">
            Select the perfect plan for your needs
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="border-2 hover-elevate">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-xl mb-1">Free</CardTitle>
                  <CardDescription className="text-sm">
                    Intelligence for everyday tasks
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">$</span>
                  <span className="text-4xl font-bold">0</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  className="w-full"
                  onClick={handleShowSignUp}
                  data-testid="button-signup-free"
                >
                  Get Started
                </Button>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Upload 10 files per month</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">20 AI prompts per month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Plan - Recommended */}
            <Card className="border-2 border-primary relative hover-elevate shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">
                  RECOMMENDED
                </Badge>
              </div>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-xl mb-1">Basic</CardTitle>
                  <CardDescription className="text-sm">
                    More access to advanced intelligence
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">$</span>
                  <span className="text-4xl font-bold">9.97</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  className="w-full"
                  onClick={handleShowSignUp}
                  data-testid="button-signup-basic"
                >
                  Get Started
                </Button>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Upload 100 files per month</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">500 AI prompts per month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plus Plan */}
            <Card className="border-2 hover-elevate">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-xl mb-1">Plus</CardTitle>
                  <CardDescription className="text-sm">
                    Secure, collaborative workspace for teams
                  </CardDescription>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm">$</span>
                  <span className="text-4xl font-bold">19.97</span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button 
                  className="w-full"
                  onClick={handleShowSignUp}
                  data-testid="button-signup-plus"
                >
                  Get Started
                </Button>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Unlimited file uploads</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-muted-foreground">Unlimited AI prompts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <Card className="text-primary-foreground border-0 shadow-xl" style={{ backgroundColor: '#2B6CB0' }}>
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of users who trust Zorli AI Vault for their file management needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary" 
                className="px-8 py-6 text-lg"
                onClick={handleShowSignUp}
                data-testid="button-signup-cta"
              >
                Sign Up
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-6 text-lg border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                onClick={handleShowSignIn}
                data-testid="button-signin-cta"
              >
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
      
      {/* Footer */}
      <footer className="border-t bg-card/50 mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2025 Zorli AI Vault. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}