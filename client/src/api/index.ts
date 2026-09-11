export const API_BASE = '/api';

export const fetchProblems = async () => {
  const res = await fetch(`${API_BASE}/problems`);
  if (!res.ok) throw new Error('Failed to fetch problems');
  return res.json();
};

export const fetchProblemDetail = async (id: number) => {
  const res = await fetch(`${API_BASE}/problems/${id}`);
  if (!res.ok) throw new Error('Failed to fetch problem detail');
  return res.json();
};

export const createAttempt = async (problemId: number, learnerName: string) => {
  const res = await fetch(`${API_BASE}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problemId, learnerName })
  });
  if (!res.ok) throw new Error('Failed to create attempt');
  return res.json();
};

export const createSubmission = async (attemptId: number, content: string) => {
  const res = await fetch(`${API_BASE}/attempts/${attemptId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error('Failed to submit design');
  return res.json();
};

export const fetchSubmission = async (id: number) => {
  const res = await fetch(`${API_BASE}/submissions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch submission');
  return res.json();
};

export const fetchLearnerAttempts = async (learnerName: string) => {
  const res = await fetch(`${API_BASE}/learners/${encodeURIComponent(learnerName)}/attempts`);
  if (!res.ok) throw new Error('Failed to fetch attempt history');
  return res.json();
};

