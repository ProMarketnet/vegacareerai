import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Placeholder: return mock credit packages
  const packages = [
    { id: '1', name: 'Starter', credits_amount: 10, price_cents: 1000, is_active: true },
    { id: '2', name: 'Professional', credits_amount: 30, price_cents: 2500, is_active: true },
    { id: '3', name: 'Expert', credits_amount: 100, price_cents: 7500, is_active: true },
  ];
  res.status(200).json(packages);
} 