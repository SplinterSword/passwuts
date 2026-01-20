"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { PasswordGeneratorModal } from "@/components/password-generator-modal"
import { Button } from "@/components/ui/button"
import { Copy, Eye, EyeOff, ChevronDown, Star, MoreVertical, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ClientGuard } from "@/components/ClientGuard"
import { useVaultStore } from "@/store/vaultStore"
import { decryptPassword } from "@pm/crypto"
import { VaultAccount, VaultItemFromAPI } from "@pm/types"

function AccountsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card
          key={i}
          className="bg-card border-border p-4 sm:p-5 animate-pulse"
        >
          <div className="space-y-4">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-8 w-full bg-muted rounded" />
            <div className="h-8 w-full bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
          </div>
        </Card>
      ))}
    </div>
  )
}


export default function AccountsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copiedItem, setCopiedItem] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<VaultAccount[]>([])
  const isUnlocked = useVaultStore((s) => s.isUnlocked)
  const cryptoKey = useVaultStore((s) => s.cryptoKey)
  const refreshCounter = useVaultStore((s) => s.refreshCounter)
  const [loading, setLoading] = useState(true)
  const [favoriteLoading, setFavoriteLoading] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!isUnlocked || !cryptoKey) {
      setAccounts([])
      setLoading(false)
      return
    }


    let cancelled = false

    async function loadVault() {
      if (!isUnlocked || !cryptoKey) {
        setAccounts([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await fetch("/api/vault")

        if (!res.ok) {
          throw new Error("Failed to fetch vault")
        }

        const data: VaultItemFromAPI[] = await res.json()

        const decrypted = await Promise.all(
          data.map(async (item) => {
            const password = await decryptPassword(
              item.encryptedPassword,
              item.iv,
              cryptoKey
            )

            return {
              id: item.id,
              name: item.name,
              url: item.url,
              username: item.username ?? item.email,
              password,
              hasWarning: item.hasWarning,
              isFavorite: item.isFavorite,
            }
          })
        )

        if (!cancelled) {
          decrypted.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
          setAccounts(decrypted)
        }
      } catch (err) {
        console.error("Vault load failed:", err)
        if (!cancelled) {
          setAccounts([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadVault()

    return () => {
      cancelled = true
    }
  }, [isUnlocked, cryptoKey, refreshCounter])


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

  const toggleFavorite = async (accountId: string) => {
    // Mark this item as loading
    setFavoriteLoading((prev) => new Set(prev).add(parseInt(accountId)))

    // Find current state
    const current = accounts.find((a) => a.id === accountId)
    if (!current) {
      setFavoriteLoading((prev) => {
        const next = new Set(prev)
        next.delete(parseInt(accountId))
        return next
      })
      return
    }

    const nextValue = !current.isFavorite

    // 🔁 Optimistic UI update
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId ? { ...a, isFavorite: nextValue } : a
      )
    )

    try {
      const res = await fetch(`/api/vault/${accountId}/favorite`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFavorite: nextValue }),
      })

      if (!res.ok) {
        throw new Error("Failed to update favorite")
      }

      // Re-sort so favorites stay on top
      setAccounts((prev) =>
        [...prev].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
      )
    } catch (err) {
      console.error("Failed to update favorite:", err)

      // ❌ Rollback on failure
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === accountId ? { ...a, isFavorite: current.isFavorite } : a
        )
      )
    } finally {
      // Clear loading state
      setFavoriteLoading((prev) => {
        const next = new Set(prev)
        next.delete(parseInt(accountId))
        return next
      })
    }
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
          {loading ? (
            <AccountsSkeleton />
          ) : accounts.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <p className="text-sm">No passwords saved yet</p>
              <p className="text-xs mt-1">
                Click “Add” to generate and store your first password
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {accounts.map((account) => (
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
                          disabled={favoriteLoading.has(parseInt(account.id))}
                          onClick={() => toggleFavorite(account.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                        >
                          <Star
                            className={`h-4 w-4 transition-colors ${account.isFavorite
                              ? "fill-yellow-400 text-yellow-400"
                              : ""
                              }`}
                          />
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
                    <Button onClick={() => window.open(account.url, "_blank")} variant="ghost" className="w-full justify-between text-foreground hover:bg-primary/90">
                      <span className="text-sm">Open in browser</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Password Generator Modal */}
        <PasswordGeneratorModal open={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    </ClientGuard>
  )
}
