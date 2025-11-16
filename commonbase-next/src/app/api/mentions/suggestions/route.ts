import { NextRequest, NextResponse } from 'next/server'

const TEST_USERS = [
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
]

const TEST_BOOKS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440102',
    title: 'Dune',
    author: 'Frank Herbert',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440103',
    title: 'The Pragmatic Programmer',
    author: 'Andrew Hunt and David Thomas',
  }
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')?.toLowerCase() || ''
  const limit = parseInt(searchParams.get('limit') || '10')

  if (query.length < 1) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const suggestions = []

    // Search test users
    for (const user of TEST_USERS) {
      const name = user.name.toLowerCase()
      const email = user.email.toLowerCase()

      if (name.includes(query) || email.includes(query)) {
        suggestions.push({
          id: user.id,
          type: 'user' as const,
          display: user.name,
          subtitle: user.email,
          image: user.image,
          text: `@${user.name}`
        })
      }
    }

    // Search test books by author FIRST (higher priority)
    for (const book of TEST_BOOKS) {
      const author = book.author.toLowerCase()

      if (author.includes(query)) {
        // Check if we already added this author
        const authorAlreadyAdded = suggestions.some(s =>
          s.type === 'author' && s.display === book.author
        )

        if (!authorAlreadyAdded) {
          suggestions.push({
            id: `author-${book.author.replace(/\s+/g, '-').toLowerCase()}`,
            type: 'author' as const,
            display: book.author,
            subtitle: 'Author',
            image: null,
            text: `@${book.author}`
          })
        }
      }
    }

    // Search test books by title SECOND (lower priority)
    for (const book of TEST_BOOKS) {
      const title = book.title.toLowerCase()
      const author = book.author.toLowerCase()

      // Only match by title, or by author if we haven't already added the author suggestion
      const matchesTitle = title.includes(query)
      const matchesAuthorButNotAdded = author.includes(query) &&
        !suggestions.some(s => s.type === 'author' && s.display === book.author)

      if (matchesTitle || matchesAuthorButNotAdded) {
        suggestions.push({
          id: book.id,
          type: 'book' as const,
          display: book.title,
          subtitle: `by ${book.author}`,
          image: null,
          text: `@${book.title}`
        })
      }
    }

    // Sort by relevance (prioritize authors, then exact matches, then partial matches)
    suggestions.sort((a, b) => {
      const aIsAuthor = a.type === 'author'
      const bIsAuthor = b.type === 'author'
      const aStartsWith = a.display.toLowerCase().startsWith(query)
      const bStartsWith = b.display.toLowerCase().startsWith(query)

      // Prioritize authors first
      if (aIsAuthor && !bIsAuthor) return -1
      if (!aIsAuthor && bIsAuthor) return 1

      // Then prioritize exact matches
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1

      return a.display.localeCompare(b.display)
    })

    const result = {
      suggestions: suggestions.slice(0, limit)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching mention suggestions:', error)
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}