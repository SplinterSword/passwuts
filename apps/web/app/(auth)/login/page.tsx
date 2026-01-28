"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import auth from "@/lib/Firebase/initialize";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

const provider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s : any) => s.setUser)

  const handleGoogleLogin = async () => {
    try {
        const result  = await signInWithPopup(auth, provider);
        const user = result.user;
        const idToken = await user.getIdToken();

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        })

        if (!response.ok) {
          throw new Error('Failed to generate cookies');
        }

        fetch('/api/me')
          .then(res => (res.ok ? res.json() : null))
          .then(data => setUser(data?.user ?? null))

        console.log("redirecting to accounts page")
        router.push('/accounts');
    } catch (error) {
        console.log(error);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-xl bg-primary/20 flex items-center justify-center">
              <Lock className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Passwuts</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Secure password management made simple</p>
        </div>

        {/* Login Card */}
        <div className="bg-secondary border border-border rounded-2xl p-6 sm:p-8 shadow-lg">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 text-center">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6 sm:mb-8 text-center">Sign in to access your passwords</p>

          {/* Google Login Button */}
          <Button
            onClick={handleGoogleLogin}
            className="w-full bg-card hover:bg-card/70 border-2 border-border text-foreground h-12 sm:h-14 text-base font-semibold rounded-xl transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20"
          >
            <svg className="h-5 w-5 sm:h-6 sm:w-6 mr-3" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-6 sm:my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-secondary px-2 text-muted-foreground">Secure Authentication</span>
            </div>
          </div>

          {/* Security Info */}
          <div className="space-y-3 text-xs sm:text-sm text-muted-foreground text-center">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <span>End-to-end encrypted</span>
            </div>
            <p>Your passwords are protected with industry-standard security</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs sm:text-sm text-muted-foreground text-center mt-6 sm:mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}
