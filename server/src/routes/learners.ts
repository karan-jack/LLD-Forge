import { Router } from 'express';
import { AttemptService } from '../services/AttemptService';

export const learnersRouter = Router();
const attemptService = new AttemptService();

learnersRouter.get('/:name/attempts', async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Learner name is required' });
    }

    const attempts = await attemptService.getAttemptHistory(name);
    res.json(attempts);
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
