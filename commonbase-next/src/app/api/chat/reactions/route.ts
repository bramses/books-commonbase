import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reactions } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentDevUser } from '@/lib/dev-auth'

export async function POST(request: NextRequest) {
  try {
    const { messageId, emoji } = await request.json()

    if (!messageId || !emoji) {
      return NextResponse.json({ error: 'Message ID and emoji are required' }, { status: 400 })
    }

    // Get current user (in dev mode, this comes from cookie)
    const currentUser = await getCurrentDevUser()

    if (!currentUser && process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { error: 'Please select a user in the dev switcher first' },
        { status: 401 }
      )
    }

    // Check if user already reacted with this emoji
    const [existingReaction] = await db
      .select()
      .from(reactions)
      .where(and(
        eq(reactions.messageId, messageId),
        eq(reactions.emoji, emoji),
        eq(reactions.userId, currentUser?.id || '')
      ))
      .limit(1)

    if (existingReaction) {
      // Remove reaction if it exists
      await db
        .delete(reactions)
        .where(eq(reactions.id, existingReaction.id))

      return NextResponse.json({ action: 'removed' })
    } else {
      // Check if there's already a reaction with this emoji from other users
      const [emojiReaction] = await db
        .select()
        .from(reactions)
        .where(and(
          eq(reactions.messageId, messageId),
          eq(reactions.emoji, emoji)
        ))
        .limit(1)

      if (emojiReaction) {
        // Increment count
        await db
          .update(reactions)
          .set({
            count: emojiReaction.count + 1,
            updatedAt: new Date()
          })
          .where(eq(reactions.id, emojiReaction.id))
      } else {
        // Create new reaction
        await db.insert(reactions).values({
          messageId,
          emoji,
          userId: currentUser?.id || null,
          count: 1
        })
      }

      return NextResponse.json({ action: 'added' })
    }
  } catch (error) {
    console.error('Error managing reaction:', error)
    return NextResponse.json({ error: 'Failed to manage reaction' }, { status: 500 })
  }
}