import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';

const router = Router();
const TMDB = 'https://api.themoviedb.org/3';

router.get('/popular', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get(`${TMDB}/movie/popular`, {
      params: { api_key: process.env.TMDB_KEY, page: req.query.page ?? 1 },
    });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string) ?? '';
    if (!q.trim()) return res.json({ results: [] });
    const { data } = await axios.get(`${TMDB}/search/movie`, {
      params: { api_key: process.env.TMDB_KEY, query: q },
    });
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = await axios.get(`${TMDB}/movie/${req.params.id}`, {
      params: { api_key: process.env.TMDB_KEY },
    });
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
