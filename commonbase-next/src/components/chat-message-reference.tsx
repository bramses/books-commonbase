'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

interface ChatMessage {
  id: string
  text: string
  createdAt: string
  user: {
    id: string | null
    name: string | null
    email: string
    image: string | null
  } | null
}

interface ChatMessageReferenceProps {
  commonbaseId: string
}

export function ChatMessageReference({ commonbaseId }: ChatMessageReferenceProps) {
  const [chatData, setChatData] = useState<{
    hasChatMessage: boolean
    message: ChatMessage | null
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchChatMessage = async () => {
      try {
        const response = await fetch(`/api/chat/message-from-commonbase/${commonbaseId}`)
        if (response.ok) {
          const data = await response.json()
          setChatData(data)
        }
      } catch (error) {
        console.error('Error fetching chat message:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchChatMessage()
  }, [commonbaseId])

  if (isLoading) {
    return null // Show nothing while loading
  }

  if (!chatData?.hasChatMessage || !chatData.message) {
    return null // This entry didn't come from chat
  }

  const scrollToChatMessage = () => {
    // Open chat with highlighting for the specific message
    const chatUrl = `/chat?highlight=${chatData.message?.id}`
    window.open(chatUrl, '_blank')
  }

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600">💬</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-800 mb-1">
              Originally from chat
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {chatData.message.user?.name || 'Unknown User'} • {' '}
              {formatDistanceToNow(new Date(chatData.message.createdAt), { addSuffix: true })}
            </div>
            <div className="text-sm text-gray-700 italic line-clamp-2 mb-3">
              "{chatData.message.text}"
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToChatMessage}
              className="text-blue-600 border-blue-300 hover:bg-blue-100"
            >
              View in Chat →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}