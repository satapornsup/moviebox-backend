import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

const getUserId = (req: Request): string =>
  (req.header('x-user-id') ?? 'demo-user').toString();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const items = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const { movieId, title, posterPath, voteAverage } = req.body as {
      movieId: number;
      title: string;
      posterPath?: string | null;
      voteAverage?: number | null;
    };

    if (!movieId || !title) {
      return res.status(400).json({ message: 'movieId and title are required' });
    }

    const va = typeof voteAverage === 'number' ? voteAverage : 0;

    const fav = await prisma.favorite.upsert({
      where: { userId_movieId: { userId, movieId } },
      create: { userId, movieId, title, posterPath: posterPath ?? null, voteAverage: va },
      update: { title, posterPath: posterPath ?? null, voteAverage: va },
    });
    res.status(201).json(fav);
  } catch (e) { next(e); }
});

router.delete('/:movieId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getUserId(req);
    const movieId = Number(req.params.movieId);
    if (Number.isNaN(movieId)) {
      return res.status(400).json({ message: 'movieId must be a number' });
    }
    await prisma.favorite.deleteMany({ where: { userId, movieId } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
