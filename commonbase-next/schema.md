User:
    - id
    - name
    - email

(using NextAuth Github provider on production)

Book:
    - id
    - title
    - author
    - description
    - cover
    - published
    - createdAt
    - updatedAt
    - ReadBy[]
        - id
        - name
        - when

Message:
    - id
    - text
    - createdAt
    - updatedAt
    - Reactions[]
        - id
        - emoji
        - count
        - createdAt
        - updatedAt
    - Mentions[]
        - id
        - type (user, book)
    - ReplyTo
        - id
    - commonbase_id

    
    