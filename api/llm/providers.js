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
    // Define available providers directly
    const providers = [
      {
        id: 'claude',
        name: 'Claude (Anthropic)',
        models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
        available: !!process.env.ANTHROPIC_API_KEY
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        models: ['llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-online'],
        available: !!process.env.PERPLEXITY_API_KEY
      },
      {
        id: 'openai',
        name: 'OpenAI GPT',
        models: ['gpt-4o-mini', 'gpt-4o'],
        available: !!process.env.OPENAI_API_KEY
      }
    ];

    res.status(200).json({
      success: true,
      providers: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch providers'
    });
  }
} 