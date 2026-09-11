import { describe, it, expect, beforeAll } from 'vitest';
import { AIEvaluator } from '../src/evaluators/AIEvaluator';
import { LLMProvider } from '../src/providers/LLMProvider';
import { TextSubmission } from '../src/domain/TextSubmission';
import { prisma } from '../src/prisma';
import { RUBRIC_CRITERIA } from '../src/rubric/rubric';

class MockProvider implements LLMProvider {
  constructor(private mockResponse: string | Error) {}
  
  async generate(prompt: string): Promise<string> {
    if (this.mockResponse instanceof Error) {
      throw this.mockResponse;
    }
    return this.mockResponse;
  }
}

describe('AIEvaluator', () => {
  let validAttemptId: number;

  beforeAll(async () => {
    const attempt = await prisma.attempt.create({
      data: {
        problemId: 1,
        learnerName: 'Test Learner'
      }
    });
    validAttemptId = attempt.id;
  });

  it('should process a valid structured AI response and return domain CriterionResults', async () => {
    const validJson = {
      criteria: RUBRIC_CRITERIA.map(c => ({
        criterion: c,
        score: 4,
        evidence: 'Some evidence',
        concern: '',
        suggestion: 'Some suggestion',
        confidence: 0.95
      }))
    };
    
    const provider = new MockProvider(JSON.stringify(validJson));
    const evaluator = new AIEvaluator(provider);

    const mockSub: TextSubmission = {
      id: 999,
      attemptId: validAttemptId,
      content: 'Sample content here',
      status: 'EVALUATING',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await evaluator.evaluate(mockSub);
    expect(result.evaluatorType).toBe('ai');
    expect(result.criteria).toHaveLength(8);
    expect(result.criteria![0].score).toBe(4);
    expect(result.criteria![0].evidence).toBe('Some evidence');
  });

  it('should throw safe error on malformed JSON', async () => {
    const provider = new MockProvider('This is just arbitrary text, not JSON');
    const evaluator = new AIEvaluator(provider);
    
    const mockSub: TextSubmission = {
      id: 999, attemptId: validAttemptId, content: 'test', status: 'EVALUATING', createdAt: new Date(), updatedAt: new Date()
    };

    await expect(evaluator.evaluate(mockSub)).rejects.toThrow('Malformed AI response: not valid JSON');
  });

  it('should throw safe error on invalid score', async () => {
    const invalidScoreJson = {
      criteria: RUBRIC_CRITERIA.map(c => ({
        criterion: c,
        score: 99, // INVALID
        evidence: '', concern: '', suggestion: '', confidence: 1.0
      }))
    };
    const provider = new MockProvider(JSON.stringify(invalidScoreJson));
    const evaluator = new AIEvaluator(provider);
    
    const mockSub: TextSubmission = {
      id: 999, attemptId: validAttemptId, content: 'test', status: 'EVALUATING', createdAt: new Date(), updatedAt: new Date()
    };

    await expect(evaluator.evaluate(mockSub)).rejects.toThrow('Invalid score');
  });

  it('should throw safe error when a criterion is missing', async () => {
    const missingCriteriaJson = {
      criteria: [
        { criterion: RUBRIC_CRITERIA[0], score: 4, evidence: '', concern: '', suggestion: '', confidence: 1.0 }
      ]
    };
    const provider = new MockProvider(JSON.stringify(missingCriteriaJson));
    const evaluator = new AIEvaluator(provider);
    
    const mockSub: TextSubmission = {
      id: 999, attemptId: validAttemptId, content: 'test', status: 'EVALUATING', createdAt: new Date(), updatedAt: new Date()
    };

    await expect(evaluator.evaluate(mockSub)).rejects.toThrow('Missing evaluation for criterion');
  });

  it('should propagate provider failures safely', async () => {
    const provider = new MockProvider(new Error('Network timeout'));
    const evaluator = new AIEvaluator(provider);
    
    const mockSub: TextSubmission = {
      id: 999, attemptId: validAttemptId, content: 'test', status: 'EVALUATING', createdAt: new Date(), updatedAt: new Date()
    };

    await expect(evaluator.evaluate(mockSub)).rejects.toThrow('Network timeout');
  });
});
