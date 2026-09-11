import { Router } from 'express';
import { prisma } from '../prisma';

export const problemsRouter = Router();

problemsRouter.get('/', async (req, res) => {
  try {
    const problems = await prisma.problem.findMany();
    res.json(problems);
  } catch (error: any) {
    console.error('GET /api/problems failed:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    });
  }
});

problemsRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid problem ID' });
    }

    const problem = await prisma.problem.findUnique({
      where: { id }
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    res.json(problem);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
