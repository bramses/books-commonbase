import { db } from '@/lib/db'
import { books, readBys, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { Book, User } from '@/lib/db/schema'

export const TEST_BOOKS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    description: 'A classic fantasy adventure about Bilbo Baggins',
    cover: null,
    published: new Date('1937-09-21'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440102',
    title: 'Dune',
    author: 'Frank Herbert',
    description: 'Epic science fiction saga set on the desert planet Arrakis',
    cover: null,
    published: new Date('1965-08-01'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440103',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt and David Thomas',
    description: 'Essential guide to becoming a better programmer',
    cover: null,
    published: new Date('1999-10-30'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440104',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    description: 'A brief history of humankind',
    cover: null,
    published: new Date('2011-01-01'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440105',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    description: 'A handbook of agile software craftsmanship',
    cover: null,
    published: new Date('2008-08-11'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440106',
    title: 'The Design of Everyday Things',
    author: 'Don Norman',
    description: 'Principles of good design and usability',
    cover: null,
    published: new Date('1988-01-01'),
  }
] as const

export async function ensureTestBooks(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  try {
    for (const testBook of TEST_BOOKS) {
      const existingBook = await db
        .select()
        .from(books)
        .where(eq(books.id, testBook.id))
        .limit(1)

      if (existingBook.length === 0) {
        await db.insert(books).values({
          id: testBook.id,
          title: testBook.title,
          author: testBook.author,
          description: testBook.description,
          cover: testBook.cover,
          published: testBook.published,
        })
      }
    }
  } catch (error) {
    console.error('Failed to ensure test books:', error)
  }
}

export async function seedTestReadData(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return
  }

  try {
    // First ensure books exist
    await ensureTestBooks()

    // Get all test users
    const testUsers = await db.select().from(users).limit(10)

    if (testUsers.length === 0) {
      console.log('No test users found, skipping read data seeding')
      return
    }

    // Add some random "read by" data
    const readData = [
      { bookId: TEST_BOOKS[0].id, userId: testUsers[0]?.id, name: testUsers[0]?.name },
      { bookId: TEST_BOOKS[0].id, userId: testUsers[1]?.id, name: testUsers[1]?.name },
      { bookId: TEST_BOOKS[1].id, userId: testUsers[0]?.id, name: testUsers[0]?.name },
      { bookId: TEST_BOOKS[2].id, userId: testUsers[2]?.id, name: testUsers[2]?.name },
      { bookId: TEST_BOOKS[3].id, userId: testUsers[1]?.id, name: testUsers[1]?.name },
      { bookId: TEST_BOOKS[3].id, userId: testUsers[2]?.id, name: testUsers[2]?.name },
    ]

    for (const read of readData) {
      if (read.userId && read.name) {
        // Check if this read record already exists
        const existing = await db
          .select()
          .from(readBys)
          .where(eq(readBys.bookId, read.bookId))
          .limit(1)

        if (existing.length === 0) {
          await db.insert(readBys).values({
            bookId: read.bookId,
            userId: read.userId,
            name: read.name,
          })
        }
      }
    }
  } catch (error) {
    console.error('Failed to seed test read data:', error)
  }
}

export async function getTestBooks(): Promise<Book[]> {
  try {
    return await db.select().from(books).limit(20)
  } catch (error) {
    console.error('Failed to get test books:', error)
    return []
  }
}

export function getAllAuthors(): string[] {
  return [...new Set(TEST_BOOKS.map(book => book.author))]
}