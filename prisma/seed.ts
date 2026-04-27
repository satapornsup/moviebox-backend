/**
 * Seed Mongo with popular movies from TMDB.
 *
 *   npm run seed              # default: 5 pages × 20 = ~100 movies
 *   npm run seed -- --pages=10
 *
 * Idempotent: re-running upserts (no duplicates), and refreshes popularity
 * / voteAverage / etc. from the latest TMDB data.
 *
 * Requires env: TMDB_KEY, DATABASE_URL
 */

import 'dotenv/config';
import axios from 'axios';
import { prisma } from '../src/lib/prisma';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  vote_average: number;
  popularity: number;
}

interface TmdbPage {
  page: number;
  results: TmdbMovie[];
  total_pages: number;
  total_results: number;
}

const TMDB = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 15_000,
});

function parseArgs() {
  const arg = process.argv.find(a => a.startsWith('--pages='));
  const pages = arg ? Number(arg.split('=')[1]) : 5;
  return { pages: Math.max(1, Math.min(50, isNaN(pages) ? 5 : pages)) };
}

async function fetchPopular(page: number): Promise<TmdbPage> {
  const apiKey = process.env.TMDB_KEY;
  if (!apiKey) throw new Error('TMDB_KEY is not set');

  const { data } = await TMDB.get<TmdbPage>('/movie/popular', {
    params: { api_key: apiKey, language: 'en-US', page },
  });
  return data;
}

async function upsertMovies(items: TmdbMovie[]) {
  // Run upserts as a single batch via $transaction so that a failure in
  // the middle doesn't leave half-baked rows. Mongo replica set required.
  const ops = items.map(m => {
    const titleLower = (m.title ?? '').toLowerCase();
    return prisma.movie.upsert({
      where: { tmdbId: m.id },
      create: {
        tmdbId: m.id,
        title: m.title,
        titleLower,
        overview: m.overview ?? '',
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        releaseDate: m.release_date,
        voteAverage: m.vote_average ?? 0,
        popularity: m.popularity ?? 0,
        syncedAt: new Date(),
      },
      update: {
        title: m.title,
        titleLower,
        overview: m.overview ?? '',
        posterPath: m.poster_path,
        backdropPath: m.backdrop_path,
        releaseDate: m.release_date,
        voteAverage: m.vote_average ?? 0,
        popularity: m.popularity ?? 0,
        syncedAt: new Date(),
      },
    });
  });
  await prisma.$transaction(ops);
}

async function main() {
  const { pages } = parseArgs();
  console.log(`▶  Seeding ${pages} page(s) of popular movies …`);

  let totalSeeded = 0;
  for (let page = 1; page <= pages; page++) {
    const data = await fetchPopular(page);
    await upsertMovies(data.results);
    totalSeeded += data.results.length;
    console.log(
      `   page ${page}/${pages}  +${data.results.length} movies  (running total: ${totalSeeded})`,
    );
  }

  const totalInDb = await prisma.movie.count();
  console.log(`✅  Done. ${totalSeeded} upserted this run, ${totalInDb} total in DB.`);
}

main()
  .catch(e => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });