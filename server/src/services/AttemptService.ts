import { prisma } from '../prisma';

export class AttemptService {
  async createAttempt(problemId: number, learnerName: string) {
    const problem = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) {
      throw new Error('Problem not found');
    }

    return await prisma.attempt.create({
      data: {
        problemId,
        learnerName
      }
    });
  }

  async getAttemptHistory(learnerName: string) {
    const attempts = await prisma.attempt.findMany({
      where: { learnerName },
      include: {
        problem: true,
        submission: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            evaluation: {
              include: { criterionresult: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return attempts.map(attempt => {
      const submissions = attempt.submission.map(sub => {
        if (sub.evaluation) {
          return {
            ...sub,
            evaluation: {
              ...sub.evaluation,
              criteria: sub.evaluation.criterionresult
            }
          };
        }
        return sub;
      });

      return {
        ...attempt,
        submissions
      };
    });
  }

  async createSubmission(attemptId: number, content: string) {
    if (!content || content.trim().length === 0) {
      throw new Error('Submission content cannot be empty');
    }

    const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt) {
      throw new Error('Attempt not found');
    }

    return await prisma.submission.create({
      data: {
        attemptId,
        content,
        status: 'SUBMITTED',
        updatedAt: new Date()
      }
    });
  }

  async getSubmission(submissionId: number) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        evaluation: {
          include: {
            criterionresult: true
          }
        }
      }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    if (submission.evaluation) {
      return {
        ...submission,
        evaluation: {
          ...submission.evaluation,
          criteria: submission.evaluation.criterionresult
        }
      };
    }

    return submission;
  }
}