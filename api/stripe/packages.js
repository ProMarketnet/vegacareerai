export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Define credit packages directly
    const packages = [
      {
        id: 'starter',
        name: 'Starter Pack',
        credits: 100,
        price_usd: 10.00,
        price_per_credit: 0.10,
        description: 'Perfect for trying out our AI services',
        popular: false
      },
      {
        id: 'professional',
        name: 'Professional Pack',
        credits: 500,
        price_usd: 45.00,
        price_per_credit: 0.09,
        description: 'Great for regular users and small teams',
        popular: true,
        savings: '10% off'
      },
      {
        id: 'enterprise',
        name: 'Enterprise Pack',
        credits: 1000,
        price_usd: 80.00,
        price_per_credit: 0.08,
        description: 'Best value for heavy users and large teams',
        popular: false,
        savings: '20% off'
      }
    ];

    res.status(200).json({
      success: true,
      packages: packages
    });
  } catch (error) {
    console.error('Error fetching credit packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit packages'
    });
  }
} 