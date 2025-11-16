import { NextResponse } from 'next/server'
import { ensureTestUsers } from '@/lib/test-users'
import { ensureTestBooks, seedTestReadData } from '@/lib/test-books'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Seed test users first
    await ensureTestUsers()

    // Seed test books
    await ensureTestBooks()

    // Seed read data (which users read which books)
    await seedTestReadData()

    return NextResponse.json({
      message: 'Test data seeded successfully',
      seeded: {
        users: true,
        books: true,
        readData: true
      }
    })
  } catch (error) {
    console.error('Error seeding test data:', error)
    return NextResponse.json({ error: 'Failed to seed test data' }, { status: 500 })
  }
}