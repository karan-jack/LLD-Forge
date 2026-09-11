import { describe, it, expect } from 'vitest';
import { RuleBasedEvaluator } from '../src/evaluators/RuleBasedEvaluator';
import { TextSubmission } from '../src/domain/TextSubmission';

describe('RuleBasedEvaluator', () => {
  const evaluator = new RuleBasedEvaluator();

  const createSubmission = (content: string): TextSubmission => ({
    id: 1,
    attemptId: 1,
    status: 'SUBMITTED',
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  it('should reject an empty submission', async () => {
    const submission = createSubmission('');
    await expect(evaluator.evaluate(submission)).rejects.toThrow('Submission is too short');
  });

  it('should reject a too-short submission', async () => {
    const submission = createSubmission('This is short.');
    await expect(evaluator.evaluate(submission)).rejects.toThrow('Submission is too short');
  });

  it('should reject a submission missing required sections (responsibilities)', async () => {
    const content = 'This is a long enough submission but it does not talk about the main things. '.repeat(10);
    const submission = createSubmission(content);
    await expect(evaluator.evaluate(submission)).rejects.toThrow('missing a section discussing class responsibilities');
  });

  it('should successfully evaluate a reasonably complete submission', async () => {
    const content = `
      Requirements: We need to design a parking lot.
      Assumptions: 3 floors.
      Class Responsibilities:
      - ParkingLot: manages everything.
      - Ticket: holds entry time.
      Trade-offs: none right now.
      Edge cases: parking lot is full.
    `;
    const submission = createSubmission(content);
    const result = await evaluator.evaluate(submission);
    
    expect(result.evaluatorType).toBe('rule_based');
    expect(result.criteria).toBeDefined();
    expect(result.criteria?.length).toBe(8);
    
    const reqCriterion = result.criteria?.find(c => c.criterion === 'Requirement understanding');
    expect(reqCriterion?.score).toBe(4);
    
    const classCriterion = result.criteria?.find(c => c.criterion === 'Class responsibilities');
    expect(classCriterion?.score).toBe(4);

    const edgeCriterion = result.criteria?.find(c => c.criterion === 'Edge cases and testability');
    expect(edgeCriterion?.score).toBe(4);
  });

  it('should score lower when some sections are absent but minimally passes', async () => {
    const content = `
      Just classes and responsibilities here.
      - ParkingLot: manages everything.
      - Ticket: holds entry time.
    `.repeat(3); // make it long enough
    
    const submission = createSubmission(content);
    const result = await evaluator.evaluate(submission);
    
    const reqCriterion = result.criteria?.find(c => c.criterion === 'Requirement understanding');
    expect(reqCriterion?.score).toBe(2); // no requirements/assumptions mentioned
  });
});
