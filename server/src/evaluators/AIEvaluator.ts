import { Evaluator } from './Evaluator';
import { Submission } from '../domain/Submission';
import { Evaluation } from '../domain/Evaluation';
import { TextSubmission } from '../domain/TextSubmission';
import { LLMProvider } from '../providers/LLMProvider';
import { RUBRIC_CRITERIA } from '../rubric/rubric';
import { prisma } from '../prisma';

export class AIEvaluator implements Evaluator {
  constructor(private provider: LLMProvider) {}

  async evaluate(submission: Submission): Promise<Omit<Evaluation, 'id' | 'submissionId' | 'createdAt'>> {
    const textSub = submission as TextSubmission;

    const attempt = await prisma.attempt.findUnique({
      where: { id: submission.attemptId },
      include: { problem: true }
    });

    if (!attempt || !attempt.problem) {
      throw new Error('Problem context not found for this attempt.');
    }

    const problem = attempt.problem;

    const prompt = `
You are an expert software architecture evaluator.
Evaluate the following student low-level design submission against the provided rubric.

### Problem Context
Title: ${problem.title}
Description: ${problem.description}
Requirements: ${problem.requirements}

### Student Submission
${textSub.content}

### Evaluation Instructions
Evaluate the submission on the following criteria:
${RUBRIC_CRITERIA.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each criterion, assign a score from 1 to 5:
1: Missing or completely incorrect
2: Poor, lacks detail or fundamental understanding
3: Average, covers basics but misses nuances
4: Good, solid understanding with minor gaps
5: Excellent, comprehensive and correct

Evidence must be grounded only in the student's submitted text. Do not fabricate quotations or claims. If the submission does not provide evidence for a criterion, explicitly state that evidence is missing.

Return ONLY a valid JSON object matching this exact structure, with no markdown formatting or extra text:
{
  "criteria": [
    {
      "criterion": "Criterion Name",
      "score": 4,
      "evidence": "Concrete quote or observation from the submission.",
      "concern": "Specific area of weakness (or empty string if none).",
      "suggestion": "Actionable advice for improvement.",
      "confidence": 0.95
    }
  ]
}

Ensure you output EXACTLY one object for each of the 8 criteria listed above.
`;

    const rawResponse = await this.provider.generate(prompt);
    let parsed: any;
    try {
      parsed = JSON.parse(rawResponse);
    } catch (e) {
      throw new Error('Malformed AI response: not valid JSON.');
    }

    if (!parsed || !Array.isArray(parsed.criteria)) {
      throw new Error('Malformed AI response: missing criteria array.');
    }

    const criteriaResults = parsed.criteria.map((item: any) => {
      if (typeof item.score !== 'number' || item.score < 1 || item.score > 5) {
         throw new Error(`Invalid score for criterion: ${item.criterion}`);
      }
      return {
        criterion: item.criterion,
        score: item.score,
        evidence: String(item.evidence || ''),
        concern: String(item.concern || ''),
        suggestion: String(item.suggestion || ''),
        confidence: typeof item.confidence === 'number' ? item.confidence : 1.0,
      };
    });

    const returnedCriteria = new Set(criteriaResults.map((c: any) => c.criterion));
    for (const req of RUBRIC_CRITERIA) {
      if (!returnedCriteria.has(req)) {
        throw new Error(`Missing evaluation for criterion: ${req}`);
      }
    }

    return {
      evaluatorType: 'ai',
      criteria: criteriaResults
    };
  }
}