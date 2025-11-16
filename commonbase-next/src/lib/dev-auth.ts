import { cookies } from 'next/headers'
import { getTestUser } from './test-users'
import type { User } from '@/lib/db/schema'

export async function getCurrentDevUser(): Promise<User | null> {
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('dev-user-id')?.value

    if (!userId) {
      return null
    }

    return await getTestUser(userId)
  } catch (error) {
    console.error('Error getting current dev user:', error)
    return null
  }
}

export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development'
}