import { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  const status = (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number')
    ? err.status
    : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(status).json({ message });
};
