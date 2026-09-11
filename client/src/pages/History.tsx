import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLearnerAttempts } from '../api';

interface CriterionResult {
  id: number;
  criterion: string;
  score: number;
  evidence: string;
  concern: string;
  suggestion: string;
  confidence: number;
}

interface Evaluation {
  id: number;
  submissionId: number;
  evaluatorType: string;
  createdAt: string;
  criteria: CriterionResult[];
}

interface Submission {
  id: number;
  attemptId: number;
  content: string;
  status: 'SUBMITTED' | 'EVALUATING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  evaluation: Evaluation | null;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  requirements: string;
  difficulty: string;
  createdAt: string;
}

interface AttemptHistoryItem {
  id: number;
  problemId: number;
  learnerName: string;
  createdAt: string;
  problem: Problem;
  submissions: Submission[];
}

export default function History() {
  const [attempts, setAttempts] = useState<AttemptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo learner used across the platform
  const learnerName = 'Learner MVP';

  const loadHistory = () => {
    setLoading(true);
    setError(null);
    fetchLearnerAttempts(learnerName)
      .then(data => setAttempts(data))
      .catch(err => setError(err.message || 'Failed to load attempt history'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return <div className="loading">Loading your attempt history...</div>;
  }

  if (error) {
    return (
      <div className="history-page">
        <h1>Attempt History</h1>
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={loadHistory} className="button primary" style={{ marginTop: '10px' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Attempt History</h1>
        <p className="history-subtitle">
          Showing practice history and evaluation results for <strong>{learnerName}</strong>
        </p>
      </div>

      {attempts.length === 0 ? (
        <div className="empty-state">
          <h3>No Practice Attempts Yet</h3>
          <p>You haven't submitted any Low-Level Design solutions yet.</p>
          <p>Select a problem from the problem bank to start practicing.</p>
          <Link to="/" className="button primary large" style={{ marginTop: '16px' }}>
            Browse Problems
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {attempts.map(attempt => {
            const latestSub = attempt.submissions && attempt.submissions.length > 0 
              ? attempt.submissions[0] 
              : null;
            
            const evaluation = latestSub?.evaluation;
            const criteria = evaluation?.criteria || [];

            // Calculate overall score (average of criteria scores)
            const avgScore = criteria.length > 0
              ? (criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length).toFixed(1)
              : null;

            // Identify weakest area (lowest score) if evaluated
            const weakest = criteria.length > 0
              ? [...criteria].sort((a, b) => a.score - b.score)[0]
              : null;

            const formattedDate = new Date(attempt.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={attempt.id} className="history-card">
                <div className="history-card-header">
                  <div className="history-title-group">
                    <h2>{attempt.problem.title}</h2>
                    <span className={`difficulty ${attempt.problem.difficulty.toLowerCase()}`}>
                      {attempt.problem.difficulty}
                    </span>
                  </div>
                  <span className="history-date">{formattedDate}</span>
                </div>

                <div className="history-card-body">
                  {latestSub ? (
                    <>
                      <div className="history-status-row">
                        <span className={`status-pill ${latestSub.status.toLowerCase()}`}>
                          {latestSub.status}
                        </span>
                        {evaluation && (
                          <span className="evaluator-pill">
                            {evaluation.evaluatorType === 'ai' ? 'Gemini AI Evaluator' : 'Rule-Based Evaluator'}
                          </span>
                        )}
                      </div>

                      {evaluation && avgScore && (
                        <div className="history-stats">
                          <div className="stat-box">
                            <span className="stat-label">Average Score</span>
                            <span className="stat-value">{avgScore} / 5.0</span>
                          </div>
                          <div className="stat-box">
                            <span className="stat-label">Criteria Evaluated</span>
                            <span className="stat-value">{criteria.length} Dimensions</span>
                          </div>
                        </div>
                      )}

                      {weakest && (
                        <div className="history-weakness">
                          <span className="weakness-label">Primary Growth Area:</span>
                          <span className="weakness-criterion">
                            {weakest.criterion} ({weakest.score}/5)
                          </span>
                          {weakest.concern && (
                            <p className="weakness-detail">{weakest.concern}</p>
                          )}
                        </div>
                      )}

                      {latestSub.status === 'FAILED' && (
                        <p className="history-error-note">
                          Evaluation could not be completed. Click below to inspect details.
                        </p>
                      )}

                      <div className="history-card-actions">
                        <Link to={`/feedback/${latestSub.id}`} className="button primary">
                          {latestSub.status === 'COMPLETED' ? 'View Full Feedback' : 'View Submission'}
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="history-empty-sub">
                      <p>Attempt initialized, but no solution was submitted.</p>
                      <div className="history-card-actions">
                        <Link to={`/attempt/${attempt.id}`} className="button primary">
                          Resume Attempt
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}