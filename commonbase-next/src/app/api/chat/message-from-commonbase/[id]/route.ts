import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages, commonbase, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const commonbaseId = params.id

  try {
    // First get the commonbase entry to check if it's from a chat message
    const [entry] = await db
      .select()
      .from(commonbase)
      .where(eq(commonbase.id, commonbaseId))
      .limit(1)

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    // Check if this entry has chat message metadata
    const metadata = entry.metadata as any
    if (!metadata?.message_id || metadata?.type !== 'chat_message') {
      return NextResponse.json({
        hasChatMessage: false,
        message: null
      })
    }

    // Find the original chat message
    const [message] = await db
      .select({
        id: messages.id,
        text: messages.text,
        createdAt: messages.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        }
      })
      .from(messages)
      .leftJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.id, metadata.message_id))
      .limit(1)

    if (!message) {
      return NextResponse.json({
        hasChatMessage: false,
        message: null
      })
    }

    return NextResponse.json({
      hasChatMessage: true,
      message
    })
  } catch (error) {
    console.error('Error fetching chat message:', error)
    return NextResponse.json({ error: 'Failed to fetch chat message' }, { status: 500 })
  }
}