import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createSubmission } from '../api';

export default function Attempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Structured fields for the design write-up
  const [requirements, setRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [relationships, setRelationships] = useState('');
  const [tradeoffs, setTradeoffs] = useState('');
  const [edgeCases, setEdgeCases] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);

    // Combine structured sections into a single markdown-like text submission
    // Neutral headings are used so the RuleBasedEvaluator doesn't automatically trigger on headings.
    const combinedContent = `
# Part 1
${requirements}

# Part 2
${responsibilities}

# Part 3
${relationships}

# Part 4
${tradeoffs}

# Part 5
${edgeCases}
    `.trim();

    try {
      const submission = await createSubmission(parseInt(id), combinedContent);
      navigate(`/feedback/${submission.id}`);
    } catch (err: any) {
      alert(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="attempt-page">
      <h1>Write Your Design</h1>
      <p className="attempt-instructions">
        Complete the following sections to structurally document your low-level design. 
        Your submission will be evaluated based on clarity, responsibilities, trade-offs, and edge cases.
      </p>

      <form className="design-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>1. Requirements & Assumptions</label>
          <textarea 
            placeholder="List the core requirements you are solving for, and any assumptions you made..."
            value={requirements} 
            onChange={e => setRequirements(e.target.value)} 
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label>2. Class Responsibilities</label>
          <textarea 
            placeholder="List the main classes/entities and what they are responsible for doing..."
            value={responsibilities} 
            onChange={e => setResponsibilities(e.target.value)} 
            rows={5}
            required
          />
        </div>

        <div className="form-group">
          <label>3. Relationships & Core Flow</label>
          <textarea 
            placeholder="Explain how the classes interact with each other for the main use case..."
            value={relationships} 
            onChange={e => setRelationships(e.target.value)} 
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label>4. Trade-offs & Reasoning</label>
          <textarea 
            placeholder="Why did you choose this design over alternatives? What are the limitations?"
            value={tradeoffs} 
            onChange={e => setTradeoffs(e.target.value)} 
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label>5. Edge Cases & Testability</label>
          <textarea 
            placeholder="What edge cases or failures could occur? How is your design testable?"
            value={edgeCases} 
            onChange={e => setEdgeCases(e.target.value)} 
            rows={4}
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="button primary large" disabled={submitting}>
            {submitting ? 'Submitting Design...' : 'Submit Design'}
          </button>
        </div>
      </form>
    </div>
  );
}