'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface MentionSuggestion {
  id: string
  type: 'user' | 'book' | 'author'
  display: string
  subtitle: string
  image: string | null
  text: string
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  rows?: number
  maxRows?: number
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  disabled,
  rows = 1,
  maxRows = 5
}: MentionTextareaProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    try {
      const response = await fetch(`/api/mentions/suggestions?q=${encodeURIComponent(query)}&limit=10`)

      if (!response.ok) {
        return
      }

      const data = await response.json()

      setSuggestions(data.suggestions || [])
      setShowSuggestions((data.suggestions || []).length > 0)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Auto-resize height but maintain full width
    const textarea = e.target
    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, maxRows * 24)
    textarea.style.height = `${newHeight}px`
    textarea.style.width = '100%' // Ensure full width is maintained

    // Check for mentions
    const cursorPosition = textarea.selectionStart
    const textBeforeCursor = newValue.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9\s]*)$/)

    if (mentionMatch) {
      const query = mentionMatch[1]
      const start = cursorPosition - mentionMatch[0].length
      setMentionQuery(query)
      setMentionStart(start)
      fetchSuggestions(query)
    } else {
      setShowSuggestions(false)
      setMentionQuery('')
    }
  }

  const insertMention = (suggestion: MentionSuggestion) => {
    const beforeMention = value.substring(0, mentionStart)
    const afterCursor = value.substring(textareaRef.current?.selectionStart || 0)
    const newValue = beforeMention + suggestion.text + ' ' + afterCursor

    onChange(newValue)
    setShowSuggestions(false)

    // Move cursor after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = mentionStart + suggestion.text.length + 1
        textareaRef.current.selectionStart = newCursorPosition
        textareaRef.current.selectionEnd = newCursorPosition
        textareaRef.current.focus()
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          if (!e.shiftKey) {
            e.preventDefault()
            insertMention(suggestions[selectedIndex])
            return
          }
          break
        case 'Escape':
          e.preventDefault()
          setShowSuggestions(false)
          break
      }
    }

    onKeyDown?.(e)
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} w-full`}
        disabled={disabled}
        rows={rows}
        style={{
          width: '100%',
          minWidth: '0',
          fieldSizing: 'initial',
          resize: 'none',
          boxSizing: 'border-box'
        }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto z-50 shadow-lg border-2">
          <div className="py-2">
            <div className="px-3 py-1 text-xs font-medium text-muted-foreground border-b">
              Mention suggestions
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                className={`w-full px-3 py-2 text-left flex items-center gap-3 hover:bg-muted transition-colors ${
                  index === selectedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => insertMention(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={suggestion.image || undefined} />
                  <AvatarFallback className="text-xs">
                    {suggestion.type === 'user' ? '👤' : suggestion.type === 'book' ? '📖' : '✍️'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {suggestion.display}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.subtitle}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {suggestion.type}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}