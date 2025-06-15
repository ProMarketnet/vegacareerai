import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Placeholder: return mock rate limit status
  const status = {
    remaining: { hourly: 5, daily: 10 },
    resetTime: new Date(Date.now() + 60 * 60 * 1000),
  };
  res.status(200).json(status);
} 