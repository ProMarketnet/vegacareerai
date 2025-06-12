import type { VercelRequest, VercelResponse } from '@vercel/node';
import { QueryService } from '../../services/QueryService';

const queryService = new QueryService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { query, userId, sessionId, ipAddress } = req.body;
  const result = await queryService.processQuery(query, userId, sessionId, ipAddress);
  res.status(200).json(result);
} 