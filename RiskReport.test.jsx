import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { expect, test } from 'vitest';
import RiskReport from './RiskReport.jsx';

const report = {
  document_name: 'sample-nda.pdf',
  risk_score: 78,
  summary: 'Detected 3 clause findings.',
  retrieval_quality: {
    top_similarity: 0.91,
    mean_similarity: 0.72,
  },
  flags: [
    {
      clause_name: 'One-sided indemnity',
      risk_level: 'HIGH',
      plain_english_explanation: 'Only one party carries indemnity obligations.',
      evidence: 'Recipient shall indemnify and hold harmless Discloser.',
    },
    {
      clause_name: 'Missing governing law',
      risk_level: 'MEDIUM',
      plain_english_explanation: 'No governing law is identified.',
    },
    {
      clause_name: 'Confidentiality scope',
      risk_level: 'LOW',
      plain_english_explanation: 'The definition includes standard exclusions.',
    },
  ],
};

test('renders risk flags from the API report', () => {
  render(<RiskReport report={report} />);

  expect(screen.getByText('sample-nda.pdf')).toBeInTheDocument();
  expect(screen.getByText('RED')).toBeInTheDocument();
  expect(screen.getByText('YELLOW')).toBeInTheDocument();
  expect(screen.getByText('GREEN')).toBeInTheDocument();
  expect(screen.getByText('Only one party carries indemnity obligations.')).toBeInTheDocument();
  expect(screen.getByText('0.910')).toBeInTheDocument();
});
