import { Router } from 'express';
import { AttemptService } from '../services/AttemptService';
import { EvaluationService } from '../services/EvaluationService';

export const attemptsRouter = Router();
const attemptService = new AttemptService();
const evaluationService = new EvaluationService();

attemptsRouter.post('/', async (req, res) => {
  try {
    const { problemId, learnerName } = req.body;
    if (!problemId || !learnerName) {
      return res.status(400).json({ error: 'problemId and learnerName are required' });
    }

    const attempt = await attemptService.createAttempt(problemId, learnerName);
    res.status(201).json(attempt);
  } catch (error: any) {
    if (error.message === 'Problem not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

attemptsRouter.post('/:id/submissions', async (req, res) => {
  try {
    const attemptId = parseInt(req.params.id);
    if (isNaN(attemptId)) {
      return res.status(400).json({ error: 'Invalid attempt ID' });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Submission content is required' });
    }

    const submission = await attemptService.createSubmission(attemptId, content);

    // Return the created submission immediately with SUBMITTED status (non-blocking)
    res.status(201).json(submission);

    // Trigger evaluation in-process asynchronously without blocking the HTTP response
    evaluationService.evaluateSubmission(submission.id).catch((err: any) => {
      console.error(`Background evaluation error for submission ${submission.id}:`, err?.message || err);
    });
  } catch (error: any) {
    if (error.message === 'Attempt not found' || error.message === 'Submission content cannot be empty') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});