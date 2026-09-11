import { Router } from 'express';
import { AttemptService } from '../services/AttemptService';

export const submissionsRouter = Router();
const attemptService = new AttemptService();

submissionsRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }

    const submission = await attemptService.getSubmission(id);
    res.json(submission);
  } catch (error: any) {
    if (error.message === 'Submission not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});