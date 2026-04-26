# MovieBox Backend

Express + TypeScript + Prisma + MongoDB. Proxy TMDb API + manage user favorites.

## Stack

- Node.js 20 + TypeScript
- Express 4
- Prisma 5 (MongoDB provider)
- Jest + Supertest + jest-mock-extended (Prisma client mocked in tests)

## Setup

```bash
cp .env.example .env
# fill DATABASE_URL (Atlas) and TMDB_KEY

npm install              # also runs `prisma generate`
npm run prisma:push      # creates indexes on Atlas
npm run dev              # http://localhost:3000
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | health check |
| GET | `/api/movies/popular?page=1` | popular movies (TMDb proxy) |
| GET | `/api/movies/search?q=batman` | search movies |
| GET | `/api/movies/:id` | movie detail |
| GET | `/api/favorites` | list favorites for user (header `x-user-id`) |
| POST | `/api/favorites` | add/upsert favorite `{ movieId, title, posterPath? }` |
| DELETE | `/api/favorites/:movieId` | remove favorite |

User identification is via `x-user-id` header (defaults to `demo-user` for the workshop scope; swap for JWT later).

## Test

```bash
npm test
```

Tests use `jest-mock-extended` to mock the Prisma client — no real database required. CI runs the same way.

## Deploy (Render)

1. Push to GitHub
2. New Web Service → connect repo
3. Build Command: `npm ci && npm run build`
4. Start Command: `npm start`
5. Env: `DATABASE_URL`, `TMDB_KEY`
6. Free tier sleeps after 15 min idle — first request after wake takes ~30s

## Switch DB engine (stretch goal — covers JD MySQL/MSSQL)

The Prisma schema can target MySQL or SQL Server with minor adjustments:

```prisma
datasource db {
  provider = "mysql"        // or "sqlserver"
  url      = env("DATABASE_URL")
}

model Favorite {
  id         Int      @id @default(autoincrement())
  userId     String
  movieId    Int
  title      String
  posterPath String?
  createdAt  DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
}
```

Create branches `mysql-variant` and `mssql-variant` to demonstrate.
