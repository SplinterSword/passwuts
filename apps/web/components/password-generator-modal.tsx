"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Copy, Eye, EyeOff } from "lucide-react"
import { z } from "zod"
import { useAuthStore } from "@/store/authStore"
import { encryptPassword } from "@pm/crypto"
import { useVaultStore } from "@/store/vaultStore"

const passwordFormSchema = z.object({
  websiteName: z.string().min(1, "Website name is required").max(100, "Website name is too long"),
  websiteUrl: z.string().url("Please enter a valid URL"),
  username: z.string().max(255, "Username is too long").optional(),
  email: z.string().email("Please enter a valid email address"),
  generatedPassword: z.string().min(1, "Please generate a password first"),
})

type PasswordFormData = z.infer<typeof passwordFormSchema>

interface PasswordGeneratorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PasswordGeneratorModal({ open, onOpenChange }: PasswordGeneratorModalProps) {
  const [websiteName, setWebsiteName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [passwordLength, setPasswordLength] = useState([16])
  const [includeLowercase, setIncludeLowercase] = useState(true)
  const [includeUppercase, setIncludeUppercase] = useState(true)
  const [includeNumbers, setIncludeNumbers] = useState(true)
  const [includeSymbols, setIncludeSymbols] = useState(true)
  const [allowSpaces, setAllowSpaces] = useState(false)
  const [excludeSimilar, setExcludeSimilar] = useState(true)
  const [generatedPassword, setGeneratedPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong">("medium")
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PasswordFormData, string>>>({})
  const user = useAuthStore((s) => s.user)
  const { cryptoKey, isUnlocked } = useVaultStore()
  const triggerRefresh = useVaultStore((s) => s.triggerRefresh)


  const getSecureRandomInt = (max: number): number => {
    const randomBuffer = new Uint32Array(1)
    crypto.getRandomValues(randomBuffer)
    return randomBuffer[0] % max
  }

  const secureArrayShuffle = (array: string[]): string[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1)
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const generatePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const numbers = "0123456789"
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    const space = " "
    const similar = "il1Lo0O"

    const availablePools: string[] = []
    let allChars = ""

    if (includeLowercase) {
      let pool = lowercase
      if (excludeSimilar) {
        pool = pool
          .split("")
          .filter((char) => !similar.includes(char))
          .join("")
      }
      availablePools.push(pool)
      allChars += pool
    }

    if (includeUppercase) {
      let pool = uppercase
      if (excludeSimilar) {
        pool = pool
          .split("")
          .filter((char) => !similar.includes(char))
          .join("")
      }
      availablePools.push(pool)
      allChars += pool
    }

    if (includeNumbers) {
      let pool = numbers
      if (excludeSimilar) {
        pool = pool
          .split("")
          .filter((char) => !similar.includes(char))
          .join("")
      }
      availablePools.push(pool)
      allChars += pool
    }

    if (includeSymbols) {
      availablePools.push(symbols)
      allChars += symbols
    }

    if (allowSpaces) {
      availablePools.push(space)
      allChars += space
    }

    if (allChars === "") {
      setGeneratedPassword("")
      return
    }

    const length = passwordLength[0]
    let password = ""

    for (const pool of availablePools) {
      const randomIndex = getSecureRandomInt(pool.length)
      password += pool[randomIndex]
    }

    for (let i = password.length; i < length; i++) {
      const randomIndex = getSecureRandomInt(allChars.length)
      password += allChars[randomIndex]
    }

    const passwordArray = secureArrayShuffle(password.split(""))
    password = passwordArray.join("")

    setGeneratedPassword(password)
    calculateStrength(password)
    if (formErrors.generatedPassword) {
      setFormErrors((prev) => ({ ...prev, generatedPassword: undefined }))
    }
  }

  const calculateStrength = (password: string) => {
    let strength = 0
    if (password.length >= 12) strength++
    if (password.length >= 16) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 2) setPasswordStrength("weak")
    else if (strength <= 4) setPasswordStrength("medium")
    else setPasswordStrength("strong")
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword)
  }

  const handleSavePassword = async () => {
    const formData: PasswordFormData = {
      websiteName,
      websiteUrl,
      username: username || undefined,
      email,
      generatedPassword,
    }

    const result = passwordFormSchema.safeParse(formData)

    if (!result.success) {
      const errors: Partial<Record<keyof PasswordFormData, string>> = {}
      result.error.errors.forEach((error) => {
        const field = error.path[0]
        if (field) {
          errors[field as keyof PasswordFormData] = error.message
        }
      })
      setFormErrors(errors)
      return
    }

    // 🔐 HARD SECURITY GATES
    if (!user?.uid) {
      alert("Not authenticated")
      return
    }

    if (!isUnlocked || !cryptoKey) {
      alert("Vault is locked. Unlock vault to continue.")
      return
    }

    try {
      // Encrypt password using vault key
      const { encryptedPassword, iv } = await encryptPassword(
        generatedPassword,
        cryptoKey
      )

      const res = await fetch("/api/vault", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: websiteName,
          url: websiteUrl,
          username,
          email,
          encryptedPassword,
          iv,
          hasWarning: passwordStrength === "weak",
          isFavorite: false,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save password")
      }

      // Reset state safely
      triggerRefresh()
      setWebsiteName("")
      setWebsiteUrl("")
      setUsername("")
      setEmail("")
      setGeneratedPassword("")
      setShowPassword(false)
      setFormErrors({})

      onOpenChange(false)
    } catch (err) {
      console.error(err)
      alert("Failed to save password securely")
    }
  }



  const isFormValid = websiteName && websiteUrl && email && generatedPassword

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[520px] max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">Generate Secure Password</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create and store strong passwords for your accounts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Website & Account Details Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website-name" className="text-sm font-medium text-foreground">
                Website Name
              </Label>
              <Input
                id="website-name"
                type="text"
                placeholder="e.g., Google"
                value={websiteName}
                onChange={(e) => {
                  setWebsiteName(e.target.value)
                  if (formErrors.websiteName) {
                    setFormErrors((prev) => ({ ...prev, websiteName: undefined }))
                  }
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                required
              />
              {formErrors.websiteName && <p className="text-xs text-destructive">{formErrors.websiteName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website-url" className="text-sm font-medium text-foreground">
                Website URL
              </Label>
              <Input
                id="website-url"
                type="url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value)
                  if (formErrors.websiteUrl) {
                    setFormErrors((prev) => ({ ...prev, websiteUrl: undefined }))
                  }
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                required
              />
              {formErrors.websiteUrl && <p className="text-xs text-destructive">{formErrors.websiteUrl}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-foreground">
                Username <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (formErrors.username) {
                    setFormErrors((prev) => ({ ...prev, username: undefined }))
                  }
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
              />
              {formErrors.username && <p className="text-xs text-destructive">{formErrors.username}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (formErrors.email) {
                    setFormErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary"
                required
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>
          </div>

          {/* Password Settings Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password-length" className="text-sm font-medium text-foreground">
                  Password Length
                </Label>
                <span className="text-sm font-semibold text-primary">{passwordLength[0]}</span>
              </div>
              <Slider
                id="password-length"
                min={8}
                max={64}
                step={1}
                value={passwordLength}
                onValueChange={setPasswordLength}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lowercase"
                  checked={includeLowercase}
                  onCheckedChange={(checked) => setIncludeLowercase(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="lowercase" className="text-sm text-foreground cursor-pointer">
                  Include lowercase letters
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="uppercase"
                  checked={includeUppercase}
                  onCheckedChange={(checked) => setIncludeUppercase(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="uppercase" className="text-sm text-foreground cursor-pointer">
                  Include uppercase letters
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="numbers"
                  checked={includeNumbers}
                  onCheckedChange={(checked) => setIncludeNumbers(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="numbers" className="text-sm text-foreground cursor-pointer">
                  Include numbers
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="symbols"
                  checked={includeSymbols}
                  onCheckedChange={(checked) => setIncludeSymbols(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="symbols" className="text-sm text-foreground cursor-pointer">
                  Include symbols
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="spaces"
                  checked={allowSpaces}
                  onCheckedChange={(checked) => setAllowSpaces(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="spaces" className="text-sm text-foreground cursor-pointer">
                  Allow spaces
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-similar"
                  checked={excludeSimilar}
                  onCheckedChange={(checked) => setExcludeSimilar(checked as boolean)}
                  className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <Label htmlFor="exclude-similar" className="text-sm text-foreground cursor-pointer">
                  Exclude similar characters
                </Label>
              </div>
            </div>
          </div>

          {/* Generated Password Section */}
          {generatedPassword && (
            <div className="space-y-3 pt-4 border-t border-border">
              <Label htmlFor="generated-password" className="text-sm font-medium text-foreground">
                Generated Password
              </Label>
              <div className="relative">
                <Input
                  id="generated-password"
                  type={showPassword ? "text" : "password"}
                  value={generatedPassword}
                  readOnly
                  className="pr-20 bg-input border-border text-foreground font-mono"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {formErrors.generatedPassword && (
                <p className="text-xs text-destructive">{formErrors.generatedPassword}</p>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Strength:</span>
                <div className="flex gap-1 flex-1 max-w-[120px]">
                  <div
                    className={`h-2 flex-1 rounded ${passwordStrength === "weak" ? "bg-destructive" : passwordStrength === "medium" ? "bg-yellow-500" : "bg-green-500"}`}
                  />
                  <div
                    className={`h-2 flex-1 rounded ${passwordStrength === "medium" || passwordStrength === "strong" ? (passwordStrength === "medium" ? "bg-yellow-500" : "bg-green-500") : "bg-secondary"}`}
                  />
                  <div
                    className={`h-2 flex-1 rounded ${passwordStrength === "strong" ? "bg-green-500" : "bg-secondary"}`}
                  />
                </div>
                <span
                  className={`text-sm font-medium ${passwordStrength === "weak" ? "text-destructive" : passwordStrength === "medium" ? "text-yellow-500" : "text-green-500"}`}
                >
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={generatePassword}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              Generate Password
            </Button>
            <Button
              onClick={handleSavePassword}
              disabled={!isFormValid}
              variant="outline"
              className="w-full border-border text-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
            >
              Save Password
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
