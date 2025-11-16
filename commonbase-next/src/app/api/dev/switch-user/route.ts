import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { TEST_USERS, getTestUser, ensureTestUsers } from '@/lib/test-users'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { userId } = await request.json()

    if (!userId || !TEST_USERS.some(u => u.id === userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Ensure test users exist in database
    await ensureTestUsers()

    // Get the user from database
    const user = await getTestUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Set a cookie to remember the current test user
    const cookieStore = await cookies()
    cookieStore.set('dev-user-id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error switching user:', error)
    return NextResponse.json({ error: 'Failed to switch user' }, { status: 500 })
  }
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Ensure test users exist in database
    await ensureTestUsers()

    // Get current user from cookie
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('dev-user-id')?.value

    const currentUser = currentUserId ? await getTestUser(currentUserId) : null

    return NextResponse.json({
      testUsers: TEST_USERS,
      currentUser,
    })
  } catch (error) {
    console.error('Error getting dev users:', error)
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
  }
}