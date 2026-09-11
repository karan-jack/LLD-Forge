import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EvaluationService } from '../src/services/EvaluationService';
import { prisma } from '../src/prisma';

describe('EvaluationService', () => {
  let problemId: number;
  let attemptId: number;

  beforeAll(async () => {
    const problem = await prisma.problem.create({
      data: { title: 'Eval Service Problem', description: 'Desc', requirements: 'Req', difficulty: 'Medium' }
    });
    problemId = problem.id;

    const attempt = await prisma.attempt.create({
      data: { problemId, learnerName: 'EvalTestLearner' }
    });
    attemptId = attempt.id;
  });

  afterAll(async () => {
    await prisma.criterionResult.deleteMany({});
    await prisma.evaluation.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.attempt.deleteMany({ where: { learnerName: 'EvalTestLearner' }});
    await prisma.problem.deleteMany({ where: { title: 'Eval Service Problem' }});
  });

  it('should throw an error if the submission is already being evaluated', async () => {
    const submission = await prisma.submission.create({
      data: {
        attemptId,
        content: 'Some test content for evaluating guard',
        status: 'EVALUATING'
      }
    });

    const service = new EvaluationService();
    await expect(service.evaluateSubmission(submission.id)).rejects.toThrow('Submission is already being evaluated');
  });

  it('should select RuleBasedEvaluator when mode is rule and persist rule_based evaluatorType', async () => {
    const submission = await prisma.submission.create({
      data: {
        attemptId,
        content: 'This has class responsibilities. Requirements met. Edge cases considered. ' + 'a'.repeat(500),
        status: 'SUBMITTED'
      }
    });

    const originalMode = process.env.EVALUATOR_MODE;
    process.env.EVALUATOR_MODE = 'rule';

    try {
      const service = new EvaluationService();
      await service.evaluateSubmission(submission.id);

      const evaluation = await prisma.evaluation.findUnique({
        where: { submissionId: submission.id },
        include: { criteria: true }
      });

      expect(evaluation).toBeDefined();
      expect(evaluation?.evaluatorType).toBe('rule_based');
      expect(evaluation?.criteria.length).toBe(8);

      const updatedSub = await prisma.submission.findUnique({ where: { id: submission.id } });
      expect(updatedSub?.status).toBe('COMPLETED');
    } finally {
      process.env.EVALUATOR_MODE = originalMode;
    }
  });
});
