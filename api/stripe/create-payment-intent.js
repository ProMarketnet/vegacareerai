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

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { package_id, user_id } = req.body;

    if (!package_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Package ID and User ID are required'
      });
    }

    // Define packages
    const packages = {
      'starter': { credits: 100, price_usd: 10.00 },
      'professional': { credits: 500, price_usd: 45.00 },
      'enterprise': { credits: 1000, price_usd: 80.00 }
    };

    const selectedPackage = packages[package_id];
    if (!selectedPackage) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package ID'
      });
    }

    // For now, return a mock payment intent
    // In production, this would create a real Stripe PaymentIntent
    const mockPaymentIntent = {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.round(selectedPackage.price_usd * 100), // Convert to cents
      currency: 'usd',
      status: 'requires_payment_method'
    };

    res.status(200).json({
      success: true,
      payment_intent: mockPaymentIntent,
      package: {
        id: package_id,
        credits: selectedPackage.credits,
        price_usd: selectedPackage.price_usd
      }
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent'
    });
  }
} 