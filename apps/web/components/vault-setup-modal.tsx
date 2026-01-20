"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setupVault } from "@/lib/vault"
import { Loader2 } from "lucide-react"

interface VaultSetupModalProps {
  open: boolean
  userId: string
  onSetupComplete: () => void
}

export function VaultSetupModal({ open, userId, onSetupComplete }: VaultSetupModalProps) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!password) {
      setError("Please enter a master password")
      return
    }

    if (password.length < 8) {
      setError("Master password must be at least 8 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    try {
      await setupVault(password, userId)

      // Clear form
      setPassword("")
      setConfirmPassword("")

      // Notify parent
      onSetupComplete()
    } catch (err) {
      setError("Failed to setup vault. Please try again.")
      console.error("Vault setup error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Set Up Your Vault</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a master password to secure your passwords. You'll need this to access your vault.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSetup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Master Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter a strong password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">At least 8 characters recommended</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-foreground">
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setError("")
              }}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
          </div>

          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</div>}

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-foreground" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              "Create Vault"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
