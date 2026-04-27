import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { moviesRouter } from './routes/movies';
import favorites from './routes/favorites';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/movies', moviesRouter);
app.use('/api/favorites', favorites);
app.use(errorHandler);

export default app;
