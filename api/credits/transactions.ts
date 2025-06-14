import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreditsService } from '../../services/CreditsService';

const creditsService = new CreditsService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Use a real placeholder user ID (replace with real user ID in production)
  const userId = 'placeholder-user-id';
  const transactions = await creditsService.getUserTransactions(userId);
  res.status(200).json(transactions);
} 