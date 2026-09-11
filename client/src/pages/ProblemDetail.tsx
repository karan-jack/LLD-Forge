import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProblemDetail, createAttempt } from '../api';

interface Problem {
  id: number;
  title: string;
  description: string;
  requirements: string;
  difficulty: string;
}

export default function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProblemDetail(parseInt(id))
        .then(setProblem)
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleStartAttempt = async () => {
    if (!problem) return;
    setStarting(true);
    try {
      // Create a default user for MVP
      const attempt = await createAttempt(problem.id, 'Learner MVP');
      navigate(`/attempt/${attempt.id}`);
    } catch (err: any) {
      alert(err.message);
      setStarting(false);
    }
  };

  if (loading) return <div className="loading">Loading problem details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!problem) return <div>Problem not found.</div>;

  return (
    <div className="problem-detail">
      <div className="problem-header">
        <h1>{problem.title}</h1>
        <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
      </div>
      
      <section className="detail-section">
        <h3>Description</h3>
        <p>{problem.description}</p>
      </section>

      <section className="detail-section">
        <h3>Requirements & Constraints</h3>
        <p className="requirements-text">{problem.requirements}</p>
      </section>

      <div className="actions">
        <button 
          className="button primary large" 
          onClick={handleStartAttempt} 
          disabled={starting}
        >
          {starting ? 'Starting...' : 'Start Attempt'}
        </button>
      </div>
    </div>
  );
}