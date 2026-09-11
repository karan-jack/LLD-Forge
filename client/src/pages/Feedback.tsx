import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchSubmission } from '../api';

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
  evaluatorType: string;
  criteria: CriterionResult[];
}

interface Submission {
  id: number;
  attemptId: number;
  status: string;
  content: string;
  evaluation: Evaluation | null;
}

export default function Feedback() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const subId = parseInt(id);
    if (isNaN(subId)) {
      setError('Invalid submission ID');
      setLoading(false);
      return;
    }

    let isMounted = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      try {
        const data = await fetchSubmission(subId);
        if (!isMounted) return;
        setSubmission(data);
        setLoading(false);

        // Continue polling while evaluation is in progress
        if (data.status === 'SUBMITTED' || data.status === 'EVALUATING') {
          timerId = setTimeout(poll, 1500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message);
        setLoading(false);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [id]);

  if (loading) return <div className="loading">Loading feedback...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!submission) return <div>Submission not found.</div>;

  return (
    <div className="feedback-page">
      <h1>Evaluation Feedback</h1>
      
      <div className={`status-banner ${submission.status.toLowerCase()}`}>
        <strong>Status:</strong> {submission.status}
      </div>

      {(submission.status === 'SUBMITTED' || submission.status === 'EVALUATING') && (
        <div className="evaluating-banner">
          <div className="evaluating-spinner"></div>
          <p>
            <strong>{submission.status === 'SUBMITTED' ? 'Submission Received' : 'Evaluating Your Design'}...</strong>
          </p>
          <p className="evaluating-subtext">
            Our evaluator is analyzing your design against the 8 rubric criteria. This page updates automatically.
          </p>
        </div>
      )}

      {submission.status === 'FAILED' && (
        <div className="error-banner">
          <p>Your evaluation failed. Ensure you provided enough detail in the required sections.</p>
        </div>
      )}

      {submission.evaluation && (
        <div className="evaluation-results">
          <h2>Criterion Results</h2>
          <div className="criteria-grid">
            {submission.evaluation.criteria.map(result => (
              <div key={result.id} className={`criterion-card score-${result.score}`}>
                <div className="criterion-header">
                  <h3>{result.criterion}</h3>
                  <span className="score-badge">{result.score} / 5</span>
                </div>
                
                <div className="criterion-body">
                  <p><strong>Evidence:</strong> {result.evidence}</p>
                  {result.concern && <p className="concern"><strong>Concern:</strong> {result.concern}</p>}
                  {result.suggestion && <p className="suggestion"><strong>Suggestion:</strong> {result.suggestion}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        {submission.attemptId && (
          <Link to={`/attempt/${submission.attemptId}`} className="button primary large">
            Try Again
          </Link>
        )}
        <Link to="/" className="button secondary">Back to Problems</Link>
      </div>
    </div>
  );
}