import request from 'supertest';
import { mockDeep, DeepMockProxy, mockReset } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

// Variable name MUST start with "mock" so jest hoisting allows the
// closure to reference it from the jest.mock factory below.
const mockPrisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.mock('../src/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// import after mock so the route uses the mocked prisma
// eslint-disable-next-line @typescript-eslint/no-var-requires
import app from '../src/app';

beforeEach(() => {
  mockReset(mockPrisma);
});

describe('POST /api/favorites', () => {
  it('creates a favorite via upsert', async () => {
    mockPrisma.favorite.upsert.mockResolvedValueOnce({
      id: 'a1',
      userId: 'demo-user',
      movieId: 1,
      title: 'Test Movie',
      posterPath: null,
      createdAt: new Date('2024-01-01'),
    });

    const res = await request(app)
      .post('/api/favorites')
      .send({ movieId: 1, title: 'Test Movie' });

    expect(res.status).toBe(201);
    expect(res.body.movieId).toBe(1);
    expect(res.body.title).toBe('Test Movie');
    expect(mockPrisma.favorite.upsert).toHaveBeenCalledTimes(1);
  });

  it('rejects when movieId missing', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .send({ title: 'No Id' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/favorites', () => {
  it('lists favorites for the user', async () => {
    mockPrisma.favorite.findMany.mockResolvedValueOnce([
      {
        id: 'a1', userId: 'demo-user', movieId: 1,
        title: 'A', posterPath: null, createdAt: new Date(),
      },
      {
        id: 'a2', userId: 'demo-user', movieId: 2,
        title: 'B', posterPath: null, createdAt: new Date(),
      },
    ]);

    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(mockPrisma.favorite.findMany).toHaveBeenCalledWith({
      where: { userId: 'demo-user' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('DELETE /api/favorites/:movieId', () => {
  it('deletes by composite key', async () => {
    mockPrisma.favorite.deleteMany.mockResolvedValueOnce({ count: 1 });

    const res = await request(app).delete('/api/favorites/1');
    expect(res.status).toBe(204);
    expect(mockPrisma.favorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'demo-user', movieId: 1 },
    });
  });

  it('rejects non-numeric id', async () => {
    const res = await request(app).delete('/api/favorites/abc');
    expect(res.status).toBe(400);
  });
});
