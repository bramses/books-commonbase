import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages, users, mentions, reactions } from '@/lib/db/schema'
import { desc, eq, ilike } from 'drizzle-orm'
import { getCurrentDevUser } from '@/lib/dev-auth'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const before = searchParams.get('before') // For pagination
  const search = searchParams.get('search')

  try {
    let query = db
      .select({
        id: messages.id,
        text: messages.text,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        replyToId: messages.replyToId,
        commonbaseId: messages.commonbaseId,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .orderBy(desc(messages.createdAt))
      .limit(limit)

    if (before) {
      // Add where clause for pagination
      query = query.where(sql`${messages.createdAt} < ${before}`)
    }

    if (search) {
      query = query.where(ilike(messages.text, `%${search}%`))
    }

    const messageList = await query

    // Get mentions for each message
    const messagesWithMentions = await Promise.all(
      messageList.map(async (message) => {
        const messageMentions = await db
          .select()
          .from(mentions)
          .where(eq(mentions.messageId, message.id))

        const messageReactions = await db
          .select()
          .from(reactions)
          .where(eq(reactions.messageId, message.id))

        return {
          ...message,
          mentions: messageMentions,
          reactions: messageReactions
        }
      })
    )

    return NextResponse.json({
      messages: messagesWithMentions,
      hasMore: messageList.length === limit
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, replyToId } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 })
    }

    // Get current user (in dev mode, this comes from cookie)
    const currentUser = await getCurrentDevUser()

    if (!currentUser && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Please select a user in the dev switcher first' },
        { status: 401 }
      )
    }

    // Create the message with correct current UTC timestamp
    const now = new Date()
    const systemTime = new Date()
    const utcTime = new Date(Date.now())

    console.log('🕐 COMPREHENSIVE SERVER TIME DEBUG:', {
      now_toISOString: now.toISOString(),
      now_getTime: now.getTime(),
      systemTime_toISOString: systemTime.toISOString(),
      utcTime_toISOString: utcTime.toISOString(),
      Date_now: Date.now(),
      process_env_TZ: process.env.TZ || 'undefined',
      server_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      milliseconds_since_epoch: Date.now(),
      actual_current_time: new Date(Date.now()).toISOString(),
      test_timestamp: 'This message created at ' + new Date().toISOString()
    })

    const [newMessage] = await db
      .insert(messages)
      .values({
        text: text.trim(),
        userId: currentUser?.id || null,
        replyToId: replyToId || null,
        createdAt: now,  // Force correct current time
        updatedAt: now
      })
      .returning()

    // Parse mentions from the text (@user or @book)
    const mentionMatches = text.match(/@[^@\s]+(?:\s+[^@\s]+)*/g)

    if (mentionMatches && newMessage) {
      const { books } = await import('@/lib/db/schema')

      const mentionPromises = mentionMatches.map(async (mention) => {
        const cleanMention = mention.substring(1) // Remove @

        try {
          // Try to find user first
          const user = await db
            .select()
            .from(users)
            .where(ilike(users.name, `%${cleanMention}%`))
            .limit(1)

          if (user.length > 0) {
            await db.insert(mentions).values({
              messageId: newMessage.id,
              type: 'user',
              targetId: user[0].id,
              targetText: mention
            })
            return
          }

          // Try to find book by title
          const book = await db
            .select()
            .from(books)
            .where(ilike(books.title, `%${cleanMention}%`))
            .limit(1)

          if (book.length > 0) {
            await db.insert(mentions).values({
              messageId: newMessage.id,
              type: 'book',
              targetId: book[0].id,
              targetText: mention
            })
            return
          }

          // Try to find book by author
          const bookByAuthor = await db
            .select()
            .from(books)
            .where(ilike(books.author, `%${cleanMention}%`))
            .limit(1)

          if (bookByAuthor.length > 0) {
            await db.insert(mentions).values({
              messageId: newMessage.id,
              type: 'author',
              targetId: bookByAuthor[0].id,
              targetText: mention
            })
          }
        } catch (error) {
          console.error('Error processing mention:', mention, error)
        }
      })

      await Promise.all(mentionPromises)
    }

    // Fetch the complete message with user data
    const [completeMessage] = await db
      .select({
        id: messages.id,
        text: messages.text,
        createdAt: messages.createdAt,
        updatedAt: messages.updatedAt,
        replyToId: messages.replyToId,
        commonbaseId: messages.commonbaseId,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.id, newMessage.id))

    return NextResponse.json({ message: completeMessage })
  } catch (error) {
    console.error('Error creating message:', error)
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 })
  }
}