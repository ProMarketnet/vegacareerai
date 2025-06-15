import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Placeholder: return mock query history
  const history = [
    { id: 'q1', type: 'basic_question', text: 'What are the top skills for data science?', created_at: new Date() },
    { id: 'q2', type: 'detailed_analysis', text: 'Give me a detailed analysis of the AI job market.', created_at: new Date() },
  ];
  res.status(200).json(history);
} 