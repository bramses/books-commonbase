import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages, users, mentions, reactions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentDevUser } from '@/lib/dev-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const messageId = params.id

  try {
    const { text } = await request.json()

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

    // Check if user owns this message
    const [existingMessage] = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.id, messageId),
        eq(messages.userId, currentUser?.id || '')
      ))
      .limit(1)

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found or not authorized to edit' },
        { status: 404 }
      )
    }

    // Update the message
    const [updatedMessage] = await db
      .update(messages)
      .set({
        text: text.trim(),
        updated: new Date()
      })
      .where(eq(messages.id, messageId))
      .returning()

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
      .where(eq(messages.id, messageId))

    return NextResponse.json(completeMessage)
  } catch (error) {
    console.error('Error updating message:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { commonbaseId } = await request.json()
    const { id: messageId } = params

    if (!messageId || !commonbaseId) {
      return NextResponse.json(
        { error: 'Message ID and commonbase ID are required' },
        { status: 400 }
      )
    }

    // Update the message with the commonbaseId
    await db
      .update(messages)
      .set({
        commonbaseId,
        updatedAt: new Date()
      })
      .where(eq(messages.id, messageId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating message commonbaseId:', error)
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const messageId = params.id

  try {
    // Get current user (in dev mode, this comes from cookie)
    const currentUser = await getCurrentDevUser()

    if (!currentUser && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Please select a user in the dev switcher first' },
        { status: 401 }
      )
    }

    // Check if user owns this message
    const [existingMessage] = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.id, messageId),
        eq(messages.userId, currentUser?.id || '')
      ))
      .limit(1)

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Message not found or not authorized to delete' },
        { status: 404 }
      )
    }

    // Delete the message (mentions and reactions will cascade)
    await db.delete(messages).where(eq(messages.id, messageId))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting message:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}