"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Settings, LogOut, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface HeaderProps {
  title: string
  onAddClick?: () => void
  showAddButton?: boolean
}

export function Header({ title, onAddClick, showAddButton = true }: HeaderProps) {
  const router = useRouter()

  const handleLogout = async () => {

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        router.push("/login");
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  return (
    <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-4">
        {/* Left section - Title */}
        <div className="flex items-center shrink-0">
          <h1 className="text-lg sm:text-xl font-bold text-foreground">{title}</h1>
        </div>

        {/* Center section - Buttons and Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {showAddButton && (
            <Button
              onClick={onAddClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0 px-2 sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          )}

          <div className="relative flex-1 min-w-0">
            <Input
              type="search"
              placeholder="Search"
              className="w-full bg-card border-border text-foreground placeholder:text-muted-foreground pl-10 sm:pl-12 text-sm"
            />
            <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2">
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right section - Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full p-0 overflow-hidden ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <div className="h-full w-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                  U
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">User</p>
                  <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
