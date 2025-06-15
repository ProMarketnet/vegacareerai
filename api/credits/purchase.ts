import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Placeholder: return mock Stripe checkout session URL
  res.status(200).json({ sessionUrl: 'https://checkout.stripe.com/pay/mock-session-id' });
} 