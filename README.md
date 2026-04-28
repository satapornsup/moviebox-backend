# MovieBox Backend

Express + TypeScript + Prisma + MongoDB API for the [MovieBox Android app](../moviebox-android).
Owns a `Movie` collection seeded from TMDb plus per-user `Favorite` records.

## Stack

- Node.js 20 + TypeScript (NodeNext, strict)
- Express 4
- Prisma 5 (MongoDB provider, Atlas free tier)
- Axios (TMDb seed only — no runtime proxying)
- Jest + Supertest + jest-mock-extended

## Architecture

```
TMDb /movie/popular ──[scripts/seed.ts]──▶ MongoDB Atlas
                                                │
                       Android app ◀──[Express + Prisma]── DB
```

- The server does **not** proxy TMDb at request time. The Mongo collection is
  pre-populated by `npm run seed`, and all `/api/movies/*` endpoints serve
  from Mongo. This keeps responses fast and lets us add custom fields
  (e.g. `titleLower` for case-insensitive search) without contorting around
  TMDb's payload.
- `Movie.titleLower` is denormalized at write-time for index-friendly search.
- `Favorite` is keyed by `(userId, movieId)` — a simple `x-user-id` header
  stands in for auth so the demo can ship without JWT/OAuth scaffolding.

## Project layout

```
src/
  app.ts                 # express bootstrap, routers, error handler
  server.ts              # listen()
  lib/prisma.ts          # PrismaClient singleton (hot-reload safe)
  middleware/
    errorHandler.ts
  routes/
    movies.ts            # /popular, /search, /:id (DB-backed, paginated)
    favorites.ts         # CRUD on user's favorites
prisma/
  schema.prisma          # Movie + Favorite models
scripts/
  seed.ts                # TMDb → Mongo upsert (idempotent)
tests/
  favorites.test.ts      # supertest + mocked prisma
  __mocks__/prisma.ts
```

## Setup

```bash
cp .env.example .env
# fill DATABASE_URL (Atlas, must be a replica set — free tier is fine)
# fill TMDB_KEY  (from https://www.themoviedb.org/settings/api)

npm install              # also runs `prisma generate`
npm run prisma:push      # sync schema → indexes on Atlas
npm run seed             # ~100 movies from TMDb popular pages 1-5
npm run dev              # http://localhost:3000
```

> **Don't use `npx prisma ...`** — npx may fetch the latest version (Prisma 7)
> which has breaking changes (e.g. `url = env(...)` no longer allowed in
> `schema.prisma`). Always go through `npm run prisma:*` so the locally pinned
> v5.22.0 binary is used.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | liveness probe |
| GET | `/api/movies/popular?page=1&limit=20` | paginated popular movies |
| GET | `/api/movies/search?q=batman&page=1&limit=20` | case-insensitive search on `title` + `overview` |
| GET | `/api/movies/:id` | movie detail by TMDb id |
| GET | `/api/favorites` | list favorites for user (header `x-user-id`) |
| POST | `/api/favorites` | upsert favorite `{ movieId, title, posterPath?, voteAverage? }` |
| DELETE | `/api/favorites/:movieId` | remove favorite |

### Response shape

`/api/movies/popular` and `/api/movies/search` return:

```json
{
  "page": 1,
  "totalPages": 5,
  "total": 100,
  "results": [
    {
      "id": 1234,
      "title": "Movie Title",
      "overview": "...",
      "poster_path": "/abc.jpg",
      "backdrop_path": "/def.jpg",
      "release_date": "2024-06-01",
      "vote_average": 7.8
    }
  ]
}
```

Field names are intentionally `snake_case` to match TMDb's shape — the Android
client's `MovieDto` was already wired to it before the backend rewrite.

User identification: `x-user-id` request header. Defaults to `demo-user` if
omitted — fine for the portfolio demo, swap for JWT/OAuth before production.

## Seed script

```bash
npm run seed                  # default: 5 pages × 20 = ~100 movies
npm run seed -- --pages=10    # 10 pages = ~200 movies
```

`scripts/seed.ts` fetches `/movie/popular` from TMDb and runs
`prisma.$transaction([upsert, ...])` per page. Idempotent — re-running refreshes
`popularity` / `voteAverage` / etc. without creating duplicates.

For long-running deployments, schedule it: there's a `node-cron` dependency
already installed; wiring a daily job in `src/server.ts` is left as a TODO.

## Tests

```bash
npm test
```

`tests/favorites.test.ts` uses `jest-mock-extended` to deep-mock the Prisma
client. The `lib/prisma` module is mocked at import time so routes resolve
the mocked client. CI needs no Mongo instance.

## Deploy (Render)

1. Push to GitHub
2. New Web Service → connect repo
3. Build Command: `npm ci && npm run build`
4. Start Command: `npm start`
5. Env vars: `DATABASE_URL`, `TMDB_KEY`, `NODE_ENV=production`
6. After first deploy, run the seed once via Render Shell:
   `npm run seed -- --pages=10`

Free tier sleeps after 15 min idle — first request after wake takes ~30 s
to spin up. Acceptable for a portfolio demo, swap to a paid tier (or Fly /
Railway / Hetzner) for anything serious.

## Schema

```prisma
model Movie {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  tmdbId       Int      @unique
  title        String
  titleLower   String                  // denormalized for indexed search
  overview     String   @default("")
  posterPath   String?
  backdropPath String?
  releaseDate  String?
  voteAverage  Float    @default(0)
  popularity   Float    @default(0)
  syncedAt     DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([popularity(sort: Desc), voteAverage(sort: Desc)])
  @@index([titleLower])
}

model Favorite {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String
  movieId     Int
  title       String
  posterPath  String?
  voteAverage Float    @default(0)
  createdAt   DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
}
```

## Switch DB engine (stretch — covers JD MySQL / MSSQL)

The same schema migrates cleanly to relational stores by swapping the
provider and using auto-increment ints:

```prisma
datasource db {
  provider = "mysql"        // or "sqlserver"
  url      = env("DATABASE_URL")
}

model Favorite {
  id          Int      @id @default(autoincrement())
  userId      String
  movieId     Int
  title       String
  posterPath  String?
  voteAverage Float    @default(0)
  createdAt   DateTime @default(now())

  @@unique([userId, movieId])
  @@index([userId])
}
```

Branches `mysql-variant` / `mssql-variant` demonstrate the swap end-to-end.

## Troubleshooting

**`The datasource property 'url' is no longer supported in schema files`** —
You're hitting Prisma 7 (probably via `npx prisma`). Use `npm run prisma:push`
which routes to the locally pinned v5.22.0 binary.

**`Argument 'titleLower' is missing` during seed** — the schema's `titleLower`
field is required and has no default. The seed script computes it as
`title.toLowerCase()` per row; if you wrote a custom upsert make sure it does
the same.

**`Server selection timed out` on Atlas** — check your IP is allowlisted in
Atlas (or use `0.0.0.0/0` for the demo) and that the connection string
includes `?retryWrites=true&w=majority`.
