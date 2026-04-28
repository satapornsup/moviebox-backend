import { Router, Request } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
export const moviesRouter = Router();

function toResponseShape(m: any) {
  return {
    id: m.tmdbId,
    title: m.title,
    overview: m.overview,
    poster_path: m.posterPath,
    backdrop_path: m.backdropPath,
    release_date: m.releaseDate,
    vote_average: m.voteAverage,
  };
}

function parsePagination(req: Request) {
  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

// ── GET /api/movies/popular ──
moviesRouter.get('/popular', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req);

    const [movies, total] = await prisma.$transaction([
      prisma.movie.findMany({
        orderBy: [
          { popularity: 'desc' },
          { voteAverage: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.movie.count(),
    ]);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      results: movies.map(toResponseShape),
    });
  } catch (e) { next(e); }
});

// ── GET /api/movies/search?q=... ──
moviesRouter.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q) {
      res.json({ page: 1, totalPages: 0, total: 0, results: [] });
      return;
    }

    const { page, limit, skip } = parsePagination(req);

    const where: Prisma.MovieWhereInput = {
      OR: [
        { title:    { contains: q, mode: 'insensitive' } },
        { overview: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [movies, total] = await prisma.$transaction([
      prisma.movie.findMany({
        where,
        orderBy: [{ popularity: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.movie.count({ where }),
    ]);

    res.json({
      page,
      totalPages: Math.ceil(total / limit),
      total,
      results: movies.map(toResponseShape),
    });
  } catch (e) { next(e); }
});

// ── GET /api/movies/:id ──
moviesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid movie id' });
      return;
    }

    const movie = await prisma.movie.findUnique({ where: { tmdbId: id } });
    if (!movie) {
      res.status(404).json({ error: 'Movie not found' });
      return;
    }

    res.json(toResponseShape(movie));
  } catch (e) { next(e); }
});