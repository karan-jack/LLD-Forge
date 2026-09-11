import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProblems } from '../api';

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
}

export default function ProblemList() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProblems()
      .then(setProblems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading problems...</div>;
  if (error) return <div className="error">{error}</div>;
  if (problems.length === 0) return <div>No problems available.</div>;

  return (
    <div className="problem-list">
      <h1>Available LLD Problems</h1>
      <div className="problem-grid">
        {problems.map(problem => (
          <div key={problem.id} className="problem-card">
            <div className="problem-header">
              <h2>{problem.title}</h2>
              <span className={`difficulty ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
            </div>
            <p className="problem-desc">{problem.description}</p>
            <Link to={`/problems/${problem.id}`} className="button primary">Practice</Link>
          </div>
        ))}
      </div>
    </div>
  );
}