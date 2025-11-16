import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { User } from '@/lib/db/schema'

export const TEST_USERS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Alice Johnson',
    email: 'alice@test.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Bob Smith',
    email: 'bob@test.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Carol Davis',
    email: 'carol@test.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'David Wilson',
    email: 'david@test.com',
    image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David'
  }
] as const

export async function ensureTestUsers(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  try {
    for (const testUser of TEST_USERS) {
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, testUser.id))
        .limit(1)

      if (existingUser.length === 0) {
        await db.insert(users).values({
          id: testUser.id,
          name: testUser.name,
          email: testUser.email,
          image: testUser.image,
        })
      }
    }
  } catch (error) {
    console.error('Failed to ensure test users:', error)
  }
}

export async function getTestUser(userId: string): Promise<User | null> {
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return user[0] || null
  } catch (error) {
    console.error('Failed to get test user:', error)
    return null
  }
}

export function isTestUser(userId: string): boolean {
  return TEST_USERS.some(u => u.id === userId)
}