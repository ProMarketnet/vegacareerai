import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CreditsService } from '../../services/CreditsService';

const creditsService = new CreditsService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Placeholder: In a real app, get userId from auth/session
  const userId = req.query.userId as string || 'demo-user-id';
  const credits = await creditsService.getUserCredits(userId);
  res.status(200).json({ credits });
} 