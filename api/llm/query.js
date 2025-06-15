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
    const { query, provider = 'claude', model, max_tokens = 1000, temperature = 0.7 } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Mock response for now (we'll implement real API calls later)
    const mockResponse = {
      success: true,
      provider: provider,
      model: model || 'default',
      response: `Mock response for: "${query}". This is a simulated AI response from ${provider}. In production, this would be a real API call to ${provider}.`,
      usage: {
        prompt_tokens: query.length,
        completion_tokens: 50,
        total_tokens: query.length + 50
      },
      cost_usd: 0.001,
      credits_used: 1
    };

    // Try real API call if keys are available
    if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model || 'claude-3-haiku-20240307',
            max_tokens: max_tokens,
            messages: [{ role: 'user', content: query }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json({
            success: true,
            provider: 'claude',
            model: model || 'claude-3-haiku-20240307',
            response: data.content[0].text,
            usage: data.usage,
            cost_usd: 0.001,
            credits_used: 1
          });
        }
      } catch (error) {
        console.error('Claude API error:', error);
      }
    }

    if (provider === 'perplexity' && process.env.PERPLEXITY_API_KEY) {
      try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
          },
          body: JSON.stringify({
            model: model || 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: query }],
            max_tokens: max_tokens,
            temperature: temperature
          })
        });

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json({
            success: true,
            provider: 'perplexity',
            model: model || 'llama-3.1-sonar-small-128k-online',
            response: data.choices[0].message.content,
            usage: data.usage,
            cost_usd: 0.001,
            credits_used: 1
          });
        }
      } catch (error) {
        console.error('Perplexity API error:', error);
      }
    }

    // Return mock response if real API fails or no keys
    res.status(200).json(mockResponse);

  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process query'
    });
  }
} 