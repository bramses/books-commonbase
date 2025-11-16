'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MentionTextarea } from '@/components/mention-textarea'
import { formatDistanceToNow } from 'date-fns'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface Mention {
  id: string
  type: string
  targetId: string
  targetText: string
}

interface Reaction {
  id: string
  emoji: string
  count: number
  userId: string | null
}

interface Message {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  replyToId: string | null
  commonbaseId: string | null
  user: User | null
  mentions: Mention[]
  reactions: Reaction[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editText, setEditText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const isScrollingRef = useRef(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Format timestamp with user's browser timezone
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    // Use browser's detected timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = new Date()

    console.log('🕐 Timestamp Conversion:', {
      utcStored: timestamp,
      browserTimezone: timezone,
      convertedToLocal: date.toLocaleString(undefined, {
        timeZone: timezone,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      minutesFromNow: Math.round((now.getTime() - date.getTime()) / 1000 / 60)
    })

    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date:', timestamp)
      return 'Invalid Date'
    }

    const formatted = date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short'
    })

    console.log('✅ Final formatted timestamp:', formatted)
    return formatted
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/chat/messages')
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      setMessages(data.messages.reverse()) // Reverse to show oldest first
    } catch (error) {
      setError('Failed to load messages')
      console.error('Error fetching messages:', error)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/dev/switch-user')
      if (response.ok) {
        const data = await response.json()
        setCurrentUserId(data.currentUser?.id || null)
      }
    } catch (error) {
      console.error('Error fetching current user:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    const sendStartTime = new Date()
    console.log('📤 SENDING MESSAGE at:', {
      clientTime: sendStartTime.toISOString(),
      clientTimeMs: sendStartTime.getTime(),
      message: newMessage
    })

    try {
      let messageText = newMessage

      // If replying, prepend the reply format
      if (replyingTo) {
        messageText = `[Replying to: ${replyingTo.id.substring(0, 8)}] ${newMessage}`
      }

      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          replyToId: replyingTo?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      const receiveTime = new Date()
      console.log('📥 RECEIVED MESSAGE RESPONSE at:', {
        clientReceiveTime: receiveTime.toISOString(),
        messageCreatedAt: data.message.createdAt,
        timeDifference_ms: receiveTime.getTime() - sendStartTime.getTime(),
        messageData: data.message
      })

      setMessages(prev => [...prev, data.message])
      setNewMessage('')
      setReplyingTo(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const addToCommonbase = async (messageId: string, text: string) => {
    console.log('🚀 ADD TO COMMONBASE START:', { messageId, text })

    try {
      console.log('📤 Sending to /api/add...')
      const response = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: text,
          metadata: {
            type: 'chat_message',
            source: 'chat',
            message_id: messageId,
            title: `Chat: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
          }
        })
      })

      console.log('📥 Add response status:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Add response error:', errorText)
        throw new Error('Failed to add to commonbase')
      }

      const result = await response.json()
      console.log('✅ Add response result:', result)

      console.log('📤 Updating message with commonbaseId:', result.id)
      // Update the message in the database with the commonbaseId
      const updateResponse = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commonbaseId: result.id
        })
      })

      console.log('📥 Update response status:', updateResponse.status, updateResponse.statusText)

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text()
        console.error('❌ Update response error:', errorText)
        throw new Error('Failed to update message')
      }

      const updateResult = await updateResponse.json()
      console.log('✅ Update response result:', updateResult)

      console.log('🔄 Updating local state...')
      // Update the local state to show it's been added to commonbase
      setMessages(prev => {
        const updated = prev.map(msg => {
          if (msg.id === messageId) {
            console.log('🎯 Updating message in state:', {
              messageId,
              oldCommonbaseId: msg.commonbaseId,
              newCommonbaseId: result.id
            })
            return { ...msg, commonbaseId: result.id }
          }
          return msg
        })
        console.log('📊 Updated messages state:', updated.map(m => ({ id: m.id, commonbaseId: m.commonbaseId })))
        return updated
      })

      console.log('✅ ADD TO COMMONBASE COMPLETE')
    } catch (error) {
      console.error('❌ ADD TO COMMONBASE ERROR:', error)
      setError('Failed to add to commonbase')
    }
  }

  const scrollToMessage = (messageId: string) => {
    console.log('🎯 SCROLL TO MESSAGE START:', messageId)

    // First try exact match
    const exactElementId = `message-${messageId}`
    console.log('🔍 Looking for exact element ID:', exactElementId)
    let element = document.getElementById(exactElementId)
    console.log('📍 Exact element found:', !!element)

    // If exact match fails, try partial match (for shortened IDs in replies)
    if (!element) {
      console.log('🔍 Trying partial match for messageId:', messageId)
      const allMessages = document.querySelectorAll('[id^="message-"]')
      console.log('📊 Found', allMessages.length, 'message elements')

      for (const messageElement of allMessages) {
        const fullId = messageElement.id
        // Extract the UUID part after "message-"
        const fullMessageId = fullId.substring(8) // Remove "message-" prefix
        console.log('🔍 Checking if', fullMessageId, 'starts with', messageId)

        if (fullMessageId.startsWith(messageId)) {
          element = messageElement as HTMLElement
          console.log('✅ Found partial match:', fullId)
          break
        }
      }
    }

    if (element) {
      console.log('🚫 Setting scroll lock...')
      setIsScrolling(true)
      isScrollingRef.current = true

      console.log('📜 Scrolling to element:', element.id)
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })

      console.log('🟡 Adding highlight classes...')
      element.classList.add('bg-yellow-200', 'ring-2', 'ring-yellow-400')
      console.log('✅ Classes added:', element.className)

      // Remove highlight and unlock scrolling after 3 seconds
      setTimeout(() => {
        console.log('🔄 Removing highlight and unlocking scroll...')
        element.classList.remove('bg-yellow-200', 'ring-2', 'ring-yellow-400')
        setIsScrolling(false)
        isScrollingRef.current = false
        console.log('✅ Scroll unlock complete')
      }, 3000)
    } else {
      console.error('❌ No element found for messageId:', messageId)
      console.log('🔍 Available message elements:')
      const allMessages = document.querySelectorAll('[id^="message-"]')
      allMessages.forEach(el => console.log(' - Found:', el.id))
    }
  }

  const formatMessageText = (text: string, mentions: Mention[] | undefined) => {
    let formattedText = text

    // Format mentions
    if (mentions && mentions.length > 0) {
      mentions.forEach(mention => {
        formattedText = formattedText.replace(
          mention.targetText,
          `<span class="bg-blue-100 text-blue-800 px-1 rounded font-medium">${mention.targetText}</span>`
        )
      })
    }

    // Format reply references
    formattedText = formattedText.replace(
      /\[Replying to: ([^\]]+)\]/g,
      '<span class="text-blue-600 cursor-pointer hover:underline">[Replying to: $1]</span>'
    )

    return formattedText
  }

  const editMessage = async (messageId: string, newText: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText })
      })

      if (!response.ok) throw new Error('Failed to edit message')

      const updatedMessage = await response.json()
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? updatedMessage : msg
      ))
      setEditingMessage(null)
      setEditText('')
    } catch (error) {
      setError('Failed to edit message')
      console.error('Error editing message:', error)
    }
  }

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete message')

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (error) {
      setError('Failed to delete message')
      console.error('Error deleting message:', error)
    }
  }

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/chat/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add reaction')
      }

      // Refresh messages to get updated reactions
      fetchMessages()
    } catch (error) {
      if (error instanceof Error && error.message.includes('select a user')) {
        setError('Please select a user in the dev switcher first to react to messages')
      } else {
        setError('Failed to add reaction')
      }
      console.error('Error adding reaction:', error)
    }
  }


  // Remove auto-scroll behavior

  useEffect(() => {
    fetchMessages()
    fetchCurrentUser()

    // Set up polling for new messages (simple real-time simulation)
    const interval = setInterval(() => {
      if (!isScrollingRef.current) {
        console.log('📡 Polling for messages...')
        fetchMessages()
      } else {
        console.log('⏸️ Skipping poll - scrolling in progress')
      }
    }, 5000)
    return () => clearInterval(interval)
  }, []) // Remove dependency to prevent constant re-initialization

  // Check URL params for message highlighting (only on initial load)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const highlightId = params.get('highlight')

    if (highlightId && messages.length > 0) {
      // Only highlight once when messages first load
      const element = document.getElementById(`message-${highlightId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('bg-yellow-200', 'ring-2', 'ring-yellow-400')

        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.classList.remove('bg-yellow-200', 'ring-2', 'ring-yellow-400')
        }, 3000)

        // Remove the highlight parameter from URL so it doesn't repeat
        const url = new URL(window.location.href)
        url.searchParams.delete('highlight')
        window.history.replaceState({}, '', url.toString())
      }
    }
  }, [messages.length > 0]) // Only trigger when messages first load

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b p-4 bg-gray-50">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          💬 Chat
          <Badge variant="secondary">Beta</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discord-like chat with mentions and commonbase integration
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <Card key={message.id} id={`message-${message.id}`} className="p-4">
              <div className="flex gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={message.user?.image || undefined} />
                  <AvatarFallback>
                    {message.user?.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold">
                      {message.user?.name || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(message.createdAt)}
                    </span>
                    {message.updatedAt !== message.createdAt && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>

                  {editingMessage?.id === message.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => editMessage(message.id, editText)}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingMessage(null)
                            setEditText('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm leading-relaxed cursor-pointer"
                      dangerouslySetInnerHTML={{
                        __html: formatMessageText(message.text, message.mentions)
                      }}
                      onClick={(e) => {
                        console.log('🖱️ MESSAGE CLICK EVENT:', {
                          target: e.target,
                          tagName: (e.target as HTMLElement).tagName,
                          className: (e.target as HTMLElement).className,
                          textContent: (e.target as HTMLElement).textContent,
                          innerHTML: (e.target as HTMLElement).innerHTML
                        })

                        const target = e.target as HTMLElement

                        // Check if clicked element or its parent contains reply text
                        const checkElement = (el: HTMLElement): string | null => {
                          const text = el.textContent || el.innerText || ''
                          console.log('🔍 Checking element:', {
                            tagName: el.tagName,
                            className: el.className,
                            text: text,
                            hasReplyText: text.includes('[Replying to:')
                          })
                          const match = text.match(/\[Replying to: ([^\]]+)\]/)
                          console.log('🎯 Match result:', match)
                          return match ? match[1] : null
                        }

                        console.log('🔍 Starting click analysis...')
                        let messageId = checkElement(target)
                        console.log('🎯 Target messageId:', messageId)

                        if (!messageId && target.parentElement) {
                          console.log('🔍 Checking parent element...')
                          messageId = checkElement(target.parentElement as HTMLElement)
                          console.log('🎯 Parent messageId:', messageId)
                        }

                        if (!messageId && target.parentElement?.parentElement) {
                          console.log('🔍 Checking grandparent element...')
                          messageId = checkElement(target.parentElement.parentElement as HTMLElement)
                          console.log('🎯 Grandparent messageId:', messageId)
                        }

                        if (messageId) {
                          console.log('✅ Found messageId, scrolling to:', messageId)
                          try {
                            console.log('🔥 CALLING scrollToMessage function...')
                            scrollToMessage(messageId)
                            console.log('🔥 scrollToMessage function returned')
                          } catch (error) {
                            console.error('💥 Error in scrollToMessage:', error)
                          }
                        } else {
                          console.log('❌ No messageId found in click target or parents')
                        }
                      }}
                    />
                  )}

                  {message.mentions && message.mentions.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {message.mentions.map((mention, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {mention.type}: {mention.targetText}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {message.reactions.map((reaction) => (
                        <Button
                          key={reaction.id}
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => addReaction(message.id, reaction.emoji)}
                        >
                          {reaction.emoji} {reaction.count}
                        </Button>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyingTo(message)}
                      className="text-xs"
                    >
                      ↩️ Reply
                    </Button>

                    {/* Quick reaction buttons */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addReaction(message.id, '👍')}
                      className="text-xs"
                    >
                      👍
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addReaction(message.id, '❤️')}
                      className="text-xs"
                    >
                      ❤️
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addReaction(message.id, '😂')}
                      className="text-xs"
                    >
                      😂
                    </Button>

                    {/* Edit/Delete buttons - only show for own messages */}
                    {currentUserId && message.user?.id === currentUserId && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingMessage(message)
                            setEditText(message.text)
                          }}
                          className="text-xs"
                        >
                          ✏️ Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMessage(message.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          🗑️ Delete
                        </Button>
                      </>
                    )}

                    {!message.commonbaseId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addToCommonbase(message.id, message.text)}
                        className="text-xs"
                      >
                        ➕ Add to Commonbase
                      </Button>
                    )}

                    {message.commonbaseId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-xs"
                      >
                        <a href={`/entry/${message.commonbaseId}`} target="_blank" rel="noopener noreferrer">
                          🔗 View in Commonbase
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-gray-50">
        {replyingTo && (
          <div className="mb-3 p-2 bg-blue-50 border-l-4 border-blue-500 rounded">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-medium text-blue-700">
                  Replying to {replyingTo.user?.name || 'Unknown User'}:
                </span>
                <p className="text-sm text-gray-600 mt-1 truncate">
                  {replyingTo.text.substring(0, 100)}
                  {replyingTo.text.length > 100 ? '...' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="text-xs h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 w-full min-w-0">
          <div className="flex-1 min-w-0">
            <MentionTextarea
              value={newMessage}
              onChange={setNewMessage}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo
                ? "Type your reply... (use @ to mention users or books)"
                : "Type a message... (use @ to mention users or books)"
              }
              className="w-full resize-none"
              rows={1}
              maxRows={5}
            />
          </div>
          <Button
            onClick={sendMessage}
            disabled={isLoading || !newMessage.trim()}
            className="self-end flex-shrink-0"
          >
            Send
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line. Use @ to mention users or books.
        </p>
      </div>
    </div>
  )
}