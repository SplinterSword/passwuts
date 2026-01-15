"use client"

import type React from "react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { unlockVault } from "@/lib/vault"

interface VaultUnlockModalProps {
  open: boolean
  userId: string
  onUnlockComplete: () => void
}

export function VaultUnlockModal({
  open,
  userId,
  onUnlockComplete,
}: VaultUnlockModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!password) {
      setError("Please enter your master password")
      return
    }

    setIsLoading(true)

    try {
      // 🔐 This does EVERYTHING:
      // - fetches verifier
      // - derives key using uid
      // - attempts decryption
      // - caches key in vaultStore
      await unlockVault(password, userId)

      setPassword("")
      onUnlockComplete()
    } catch (err) {
      setError("Incorrect master password")
      console.error("Vault unlock error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Unlock Your Vault
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your master password to access your saved passwords.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">
              Master Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your master password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError("")
              }}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-foreground"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Unlocking...
              </>
            ) : (
              "Unlock Vault"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
