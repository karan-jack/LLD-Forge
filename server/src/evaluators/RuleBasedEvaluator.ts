import { Evaluator } from './Evaluator';
import { Submission } from '../domain/Submission';
import { Evaluation } from '../domain/Evaluation';
import { TextSubmission } from '../domain/TextSubmission';
import { RUBRIC_CRITERIA } from '../rubric/rubric';

export class RuleBasedEvaluator implements Evaluator {
  async evaluate(submission: Submission): Promise<Omit<Evaluation, 'id' | 'submissionId' | 'createdAt'>> {
    const textSub = submission as TextSubmission;
    if (!textSub.content || textSub.content.trim().length < 50) {
      throw new Error('Submission is too short. Please provide a more detailed design write-up.');
    }

    const content = textSub.content.toLowerCase();
    
    // Check for some basic keywords/sections
    const hasResponsibilities = content.includes('responsibilit') || content.includes('class');
    const hasTradeoffs = content.includes('trade-off') || content.includes('tradeoff') || content.includes('reasoning') || content.includes('alternative');
    
    if (!hasResponsibilities) {
      throw new Error('Submission is missing a section discussing class responsibilities.');
    }

    // Since this is just a structural MVP RuleBasedEvaluator, we generate a result array 
    // based on simple keyword matches for demonstration.
    // In a real scenario, this might just pass validation and the AI does the scoring.
    // But since the assignment says "For this task, only RuleBasedEvaluator is active."
    // and "The RuleBasedEvaluator should produce useful, explainable feedback. Avoid returning only Score: 60."
    // We will generate CriterionResults using simple rules.

    const criteriaResults = RUBRIC_CRITERIA.map(criterion => {
      let score = 3;
      let evidence = 'Found some related keywords in the submission.';
      let concern = 'The discussion could be more detailed.';
      let suggestion = 'Consider expanding on this area.';
      
      if (criterion === 'Requirement understanding') {
        if (content.includes('require') || content.includes('assum')) {
          score = 4;
          evidence = 'The submission includes a section on requirements/assumptions.';
          concern = '';
          suggestion = 'Ensure all edge cases in requirements are mapped to components.';
        } else {
          score = 2;
          evidence = 'No explicit requirements or assumptions section found.';
          concern = 'Missing explicit statement of requirements.';
          suggestion = 'Start your design by listing assumed requirements and constraints.';
        }
      }
      
      if (criterion === 'Class responsibilities') {
        if (hasResponsibilities) {
          score = 4;
          evidence = 'Classes and their responsibilities are discussed.';
          concern = '';
          suggestion = 'Ensure single responsibility principle is maintained for all listed classes.';
        } else {
          score = 1;
          evidence = 'No discussion of responsibilities found.';
          concern = 'The core components of the design are unclear.';
          suggestion = 'Explicitly list classes and what each class is responsible for.';
        }
      }

      if (criterion === 'Edge cases and testability') {
        if (content.includes('edge case') || content.includes('test') || content.includes('fail')) {
          score = 4;
          evidence = 'Edge cases or failure modes are discussed.';
          concern = '';
          suggestion = 'Consider more distributed system failure modes if applicable.';
        } else {
          score = 2;
          evidence = 'No explicit discussion of edge cases found.';
          concern = 'The design may not handle unexpected inputs or failures well.';
          suggestion = 'Add a section discussing potential edge cases and how the system handles them.';
        }
      }

      if (criterion === 'Quality of explanation') {
        if (textSub.content.length > 500) {
          score = 4;
          evidence = 'The submission is sufficiently detailed.';
          concern = '';
          suggestion = 'Consider using diagrams or structured lists to improve readability.';
        } else {
          score = 2;
          evidence = 'The submission is relatively brief.';
          concern = 'Lack of depth in explanations.';
          suggestion = 'Elaborate more on your design decisions.';
        }
      }

      return {
        criterion,
        score,
        evidence,
        concern,
        suggestion,
        confidence: 1.0,
      };
    });

    return {
      evaluatorType: 'rule_based',
      criteria: criteriaResults
    };
  }
}