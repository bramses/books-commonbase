'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User } from '@/lib/db/schema'

interface DevUserSwitcherProps {
  className?: string
}

interface TestUser {
  id: string
  name: string
  email: string
  image?: string | null
}

interface DevUserData {
  testUsers: TestUser[]
  currentUser: User | null
}

export function DevUserSwitcher({ className }: DevUserSwitcherProps) {
  const [userData, setUserData] = useState<DevUserData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/dev/switch-user')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUserData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const switchUser = async (userId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dev/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to switch user')
      }

      // Refresh the page to update the session
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch user')
    } finally {
      setIsLoading(false)
    }
  }

  const clearUser = async () => {
    setIsLoading(true)
    try {
      // Clear the cookie by setting it with an expired date
      document.cookie = 'dev-user-id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear user')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  if (!userData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-sm">🧪 Dev User Switcher</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          🧪 Dev User Switcher
          <Badge variant="secondary" className="text-xs">
            DEV ONLY
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {userData.currentUser && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs font-medium mb-1">Current User:</p>
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={userData.currentUser.image || undefined} />
                <AvatarFallback className="text-xs">
                  {userData.currentUser.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{userData.currentUser.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUser}
                disabled={isLoading}
                className="ml-auto h-6 px-2 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs font-medium">Switch to:</p>
          {userData.testUsers.map((user) => (
            <Button
              key={user.id}
              variant="ghost"
              size="sm"
              onClick={() => switchUser(user.id)}
              disabled={isLoading || userData.currentUser?.id === user.id}
              className="w-full justify-start h-8 px-2"
            >
              <Avatar className="w-5 h-5 mr-2">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="text-xs">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{user.name}</span>
              {userData.currentUser?.id === user.id && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  Current
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}