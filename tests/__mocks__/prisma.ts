// Optional helper if multiple test files need to share a mocked client.
// Note: when using `jest.mock()` factory, the variable referenced in the
// factory must be prefixed with "mock" for jest's hoisting to allow it,
// e.g. `const mockPrisma = ...`. See tests/favorites.test.ts.
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

export const mockPrisma = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;
