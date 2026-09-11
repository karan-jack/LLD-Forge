import 'dotenv/config';
import express from 'express';
import { problemsRouter } from './routes/problems';
import { attemptsRouter } from './routes/attempts';
import { submissionsRouter } from './routes/submissions';
import { learnersRouter } from './routes/learners';

export const app = express();

app.use(express.json());

app.use('/api/problems', problemsRouter);
app.use('/api/attempts', attemptsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/learners', learnersRouter);