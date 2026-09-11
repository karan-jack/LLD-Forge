import { prisma } from '../prisma';
import { Evaluator } from '../evaluators/Evaluator';
import { RuleBasedEvaluator } from '../evaluators/RuleBasedEvaluator';
import { AIEvaluator } from '../evaluators/AIEvaluator';
import { GeminiProvider } from '../providers/GeminiProvider';

export class EvaluationService {
  private evaluator: Evaluator;

  constructor() {
    const mode = process.env.EVALUATOR_MODE || 'rule';
    if (mode === 'ai') {
      this.evaluator = new AIEvaluator(new GeminiProvider());
    } else {
      this.evaluator = new RuleBasedEvaluator();
    }
  }

  async evaluateSubmission(submissionId: number): Promise<void> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.status === 'EVALUATING' || submission.status === 'COMPLETED') {
      throw new Error('Submission is already being evaluated');
    }

    // Move to EVALUATING state atomically to prevent concurrent race conditions
    const updateResult = await prisma.submission.updateMany({
      where: {
        id: submissionId,
        status: { in: ['SUBMITTED', 'FAILED'] }
      },
      data: { status: 'EVALUATING' }
    });

    if (updateResult.count === 0) {
      throw new Error('Submission is already being evaluated');
    }

    try {
      // Create a domain object wrapper if necessary, or pass the prisma object
      // Assuming prisma object matches TextSubmission interface shape
      const textSubmission = {
        id: submission.id,
        attemptId: submission.attemptId,
        content: submission.content,
        status: 'EVALUATING' as const,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
      };

      const evalResult = await this.evaluator.evaluate(textSubmission);

      // Save Evaluation and Criteria
      await prisma.$transaction(async (tx) => {
        const evaluation = await tx.evaluation.create({
          data: {
            submissionId: submission.id,
            evaluatorType: evalResult.evaluatorType,
            criterionresult: {
              create: evalResult.criteria?.map(c => ({
                criterion: c.criterion,
                score: c.score,
                evidence: c.evidence,
                concern: c.concern,
                suggestion: c.suggestion,
                confidence: c.confidence
              })) || []
            }
          }
        });

        await tx.submission.update({
          where: { id: submission.id },
          data: { status: 'COMPLETED' }
        });
      });
    } catch (error: any) {
      // Set to FAILED if rule evaluator throws an error or anything else fails
      await prisma.submission.update({
        where: { id: submission.id },
        data: { status: 'FAILED' }
      });
      // Optionally log error
      console.error(`Evaluation failed for submission ${submissionId}:`, error.message);
    }
  }
}