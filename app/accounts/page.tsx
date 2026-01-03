"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { PasswordGeneratorModal } from "@/components/password-generator-modal"
import { Button } from "@/components/ui/button"
import { Copy, Eye, EyeOff, ChevronDown, Star, MoreVertical, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ClientGuard } from "@/components/ClientGuard"

// Mock data for accounts
const mockAccounts = [
  {
    id: 1,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "P@ssw0rd123",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 2,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "MyS3cur3Pass",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 3,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "Str0ngP@ss!",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 4,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "S3cr3tK3y!",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 5,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "P4ssC0d3#",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 6,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "M@st3rKey!",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 7,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "Sup3rS3cr3t",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 8,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "Ultim@te99",
    hasWarning: true,
    isFavorite: false,
  },
  {
    id: 9,
    name: "Account Ubisoft",
    url: "https://account.ub...",
    username: "apollo1234",
    password: "Pr0t3ct3d!",
    hasWarning: true,
    isFavorite: false,
  },
]

export default function AccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copiedItem, setCopiedItem] = useState<string | null>(null)

  const togglePasswordVisibility = (accountId: number) => {
    setVisiblePasswords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItem(itemId)
      setTimeout(() => setCopiedItem(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <ClientGuard>
      <div className="min-h-screen bg-background">
        <Header title="Accounts" onAddClick={() => setIsModalOpen(true)} />

        <div className="px-4 sm:px-6 py-6 max-w-[1800px] mx-auto">
          {/* Filter Section */}
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-foreground">Show:</span>
              <Button variant="ghost" className="text-foreground hover:bg-secondary gap-1 h-8 px-3">
                All categories
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Accounts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {mockAccounts.map((account) => (
              <Card key={account.id} className="bg-card border-border p-4 sm:p-5 hover:bg-card/80 transition-colors">
                <div className="space-y-4">
                  {/* Header with name and actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm break-words">{account.name}</h3>
                      <p className="text-xs text-muted-foreground break-all">{account.url}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Username */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2 gap-2">
                      <span className="text-sm text-foreground font-mono break-all">{account.username}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => copyToClipboard(account.username, `username-${account.id}`)}
                      >
                        {copiedItem === `username-${account.id}` ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between bg-secondary/50 rounded px-3 py-2 gap-2">
                      <span className="text-sm text-foreground font-mono break-all">
                        {visiblePasswords.has(account.id) ? account.password : "••••••••"}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => togglePasswordVisibility(account.id)}
                        >
                          {visiblePasswords.has(account.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => copyToClipboard(account.password, `password-${account.id}`)}
                        >
                          {copiedItem === `password-${account.id}` ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Warning Message */}
                  {account.hasWarning && (
                    <div className="flex items-center gap-2 text-destructive text-xs">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <span className="break-words">Passwords require your attention</span>
                    </div>
                  )}

                  {/* Open in Browser Button */}
                  <Button variant="ghost" className="w-full justify-between text-foreground hover:bg-secondary">
                    <span className="text-sm">Open in browser</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Password Generator Modal */}
        <PasswordGeneratorModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    </ClientGuard>
  )
}
