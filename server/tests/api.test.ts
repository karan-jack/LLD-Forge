import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/prisma';

vi.mock('../src/providers/GeminiProvider', () => {
  return {
    GeminiProvider: class {
      async generate(prompt: string) {
        if (prompt.includes('This is short.')) {
          throw new Error('Simulated Gemini Provider Error');
        }
        return JSON.stringify({
          criteria: [
            "Requirement understanding",
            "Class responsibilities",
            "Coupling / cohesion",
            "Encapsulation and interfaces",
            "Appropriate use of abstraction / patterns",
            "Extensibility",
            "Edge cases and testability",
            "Quality of explanation"
          ].map(c => ({
            criterion: c,
            score: 4,
            evidence: 'Mock evidence',
            concern: '',
            suggestion: 'Mock suggestion',
            confidence: 0.95
          }))
        });
      }
    }
  };
});

describe('API & Domain Integration Tests', () => {
  beforeAll(async () => {
    // Ensure DB has the problems
    const count = await prisma.problem.count();
    if (count === 0) {
      await prisma.problem.createMany({
        data: [
          { title: 'Parking Lot', description: 'Desc', requirements: 'Req', difficulty: 'Medium' }
        ]
      });
    }
  });

  afterAll(async () => {
    // Cleanup created attempts and submissions for this test
    await prisma.criterionresult.deleteMany({});
    await prisma.evaluation.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.attempt.deleteMany({ where: { learnerName: 'TestLearner' }});
  });

  let problemId: number;
  let attemptId: number;
  let submissionId: number;

  it('should fetch problems', async () => {
    const res = await request(app).get('/api/problems');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    problemId = res.body[0].id;
  });

  it('should fetch a specific problem by id', async () => {
    const res = await request(app).get(`/api/problems/${problemId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(problemId);
    expect(res.body.title).toBeDefined();
    expect(res.body.requirements).toBeDefined();
    expect(res.body.difficulty).toBeDefined();
  });

  it('should handle nonexistent problem fetch', async () => {
    const res = await request(app).get('/api/problems/99999');
    expect(res.status).toBe(404);
  });

  it('should create an attempt', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .send({ problemId, learnerName: 'TestLearner' });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.learnerName).toBe('TestLearner');
    attemptId = res.body.id;
  });

  it('should handle invalid attempt creation', async () => {
    const res = await request(app)
      .post('/api/attempts')
      .send({ problemId: 99999, learnerName: 'TestLearner' });
    expect(res.status).toBe(404);
  });

  it('should handle submission to nonexistent attempt', async () => {
    const res = await request(app)
      .post('/api/attempts/99999/submissions')
      .send({ content: 'Some content' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Attempt not found');
  });

  it('should handle submission with empty content', async () => {
    const res = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({ content: '   ' }); // whitespace only
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Submission content cannot be empty');
    
    const resMissing = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({}); // missing content
    expect(resMissing.status).toBe(400);
    expect(resMissing.body.error).toBe('Submission content is required');
  });

  const waitForStatus = async (subId: number, expectedStatus: string, maxAttempts = 20, delayMs = 100) => {
    for (let i = 0; i < maxAttempts; i++) {
      const res = await request(app).get(`/api/submissions/${subId}`);
      if (res.body.status === expectedStatus) {
        return res;
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
    return await request(app).get(`/api/submissions/${subId}`);
  };

  it('should successfully submit and evaluate a design (non-blocking evaluation flow)', async () => {
    const content = `
      Requirements: Need a parking lot.
      Assumptions: Multiple floors.
      Class Responsibilities:
      - ParkingLot
      - Ticket
      Edge cases and testability handled.
      Trade-offs are none.
    `;
    const res = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({ content });
    
    // Submission response returns promptly with SUBMITTED status (non-blocking)
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('SUBMITTED');
    submissionId = res.body.id;

    // Background evaluation asynchronously updates to COMPLETED
    const completedRes = await waitForStatus(submissionId, 'COMPLETED');
    expect(completedRes.status).toBe(200);
    expect(completedRes.body.status).toBe('COMPLETED');
    expect(completedRes.body.evaluation).toBeDefined();
    expect(completedRes.body.evaluation.criteria.length).toBe(8);
  });

  it('should retrieve submission feedback', async () => {
    const res = await request(app).get(`/api/submissions/${submissionId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.evaluation).toBeDefined();
    expect(res.body.evaluation.criteria[0].score).toBeDefined();
  });

  it('should handle nonexistent submission fetch', async () => {
    const res = await request(app).get('/api/submissions/99999');
    expect(res.status).toBe(404);
  });

  it('should handle failed evaluation flow for missing sections', async () => {
    const content = `This is short.`;
    const res = await request(app)
      .post(`/api/attempts/${attemptId}/submissions`)
      .send({ content });
    
    // Submission response returns promptly with SUBMITTED status
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('SUBMITTED');

    // Background evaluation catches failure and sets status to FAILED
    const failedRes = await waitForStatus(res.body.id, 'FAILED');
    expect(failedRes.status).toBe(200);
    expect(failedRes.body.status).toBe('FAILED');
    expect(failedRes.body.evaluation).toBeNull();
  });

  it('should fetch attempt history for learner', async () => {
    const res = await request(app).get('/api/learners/TestLearner/attempts');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].submissions.length).toBeGreaterThan(0);
  });
});
